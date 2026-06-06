// lib/userContext.ts
//
// Builds a complete user context object from:
//   - card balances (credit limit, available credit, points balance, APR)
//   - transaction history (spending behaviour, category breakdown, cap progress)
//
// This is fed into the OP agent prompt so Gemini reasons over the
// REAL user, not a hypothetical optimal user.

import { connectDB } from '@/lib/mongodb'
import { FiatCard } from '@/lib/models/FiatCard'
import { Transaction } from '@/lib/models/Transaction'

export interface CardLiveState {
  cardId: string
  displayName: string

  // Credit health
  creditLimit: number | null
  currentBalanceOwed: number
  availableCredit: number | null
  utilizationPct: number | null
  standardAprPct: number

  // Existing rewards
  pointsBalance: number
  pointsValueUsd: number

  // OP token state (USD cards only — null when not applicable)
  opTokenState: {
    tokenBalance: number                // raw OP token count (= credit_token_balance)
    tokenValueUsd: number               // tokenBalance * op_cents_per_token / 100
    opCentsPerToken: number             // redemption rate for this card
    minRedeemThreshold: number          // min tokens needed to redeem
    isTokenLow: boolean                 // tokenBalance < minRedeemThreshold
  } | null

  // Category cap progress this month
  categoryCapProgress: {
    category: string
    spentTowardsCap: number
    capLimit: number | null
    remainingCapRoom: number | null
  }[]
  annualSpendUsd: number
}

export interface SpendingBehaviour {
  // ── Cross-card aggregate (last 90 days) ────────────────────────────────────
  categoryBreakdown: {
    category: string
    totalSpentUsd: number
    txCount: number
    sharePct: number
    avgTxSizeUsd: number
  }[]

  // ── Per-card category breakdown ────────────────────────────────────────────
  // Key: cardId — tells Gemini which card the user actually swipes per category
  cardCategoryBreakdown: Record<string, {
    category: string
    totalSpentUsd: number
    txCount: number
    sharePct: number          // share of that card's own total spend
  }[]>

  // ── Merchant tracking ──────────────────────────────────────────────────────
  topMerchants: {
    merchant: string
    totalSpentUsd: number
    txCount: number
    category: string          // most common category for this merchant
    primaryCardId: string     // card the user most often swipes at this merchant
  }[]

  // Per-card top merchants
  cardTopMerchants: Record<string, {
    merchant: string
    totalSpentUsd: number
    txCount: number
  }[]>

  // ── Lifestyle signals ──────────────────────────────────────────────────────
  topCategory: string
  isFrequentTraveller: boolean
  isFrequentDiner: boolean
  isOnlineShopper: boolean
  isGroceryDominant: boolean
  monthlyAvgSpendUsd: number  // now dynamic — based on actual months in window

  // ── Monthly trend (last 3 months) ─────────────────────────────────────────
  monthlyTrend: {
    month: string             // 'YYYY-MM'
    totalSpentUsd: number
    categoryBreakdown: { category: string; totalSpentUsd: number; sharePct: number }[]
  }[]
  // Derived from monthlyTrend — positive = growing, negative = shrinking
  momSpendChangePct: number | null    // month-over-month change in total spend %
  fastestGrowingCategory: string | null  // category with biggest MoM $ increase

  // ── Redemption behaviour ───────────────────────────────────────────────────
  actualAvgCppAchieved: number | null  // now from type:'redemption' transactions
  totalPointsRedeemed90d: number       // sum of pointsRedeemed in last 90 days
  redemptionCount90d: number           // how many times user has redeemed

  // ── EMI behaviour ─────────────────────────────────────────────────────────
  emiTransactionPct: number
}

export interface UserContext {
  userId: string
  cards: CardLiveState[]
  behaviour: SpendingBehaviour
  totalOpTokens: number        // sum of credit_token_balance across all USD cards
  totalOpBalanceUsd: number    // sum of each card's tokenBalance * op_cents_per_token / 100
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export async function buildUserContext(userId: string, preFetchedCards?: any[]): Promise<UserContext> {
  await connectDB()

  // 1. Fetch all cards (or use pre-fetched)
  const cards = preFetchedCards || await FiatCard.find({ user_id: userId })
    .select({
      card_id: 1,
      display_name: 1,
      network: 1,
      card_type: 1,
      currency_type: 1,
      credit_token_balance: 1,
      points_balance: 1,
      points_value_cents: 1,
      current_balance_owed: 1,
      credit_limit: 1,
      rewards_structure: 1,
      benefits_and_credits: 1,
      financials: 1,
      op_redemption: 1,
    })
    .lean()

  // 2. Fetch last 90 days of transactions
  const since = new Date()
  since.setDate(since.getDate() - 90)
  const txns = await Transaction.find({
    userId,
    type: 'spend',
    createdAt: { $gte: since },
  })
    .select({
      userId: 1,
      cardId: 1,
      amountUsd: 1,
      category: 1,
      merchant: 1,
      createdAt: 1,
    })
    .lean()

  // 3. Fetch last 90 days of REDEMPTION transactions separately
  const redemptionTxns = await Transaction.find({
    userId,
    type: 'redemption',
    createdAt: { $gte: since },
  })
    .select({
      userId: 1,
      cardId: 1,
      pointsRedeemed: 1,
      valueReceivedUsd: 1,
      createdAt: 1,
    })
    .lean()

  // 2b. Fetch last 365 days of transactions for annual spend
  const since365 = new Date()
  since365.setDate(since365.getDate() - 365)
  const annualTxns = await Transaction.find({
    userId,
    type: 'spend',
    createdAt: { $gte: since365 },
  })
    .select({
      userId: 1,
      cardId: 1,
      amountUsd: 1,
      createdAt: 1,
    })
    .lean()

  // ── Card live states ──────────────────────────────────────────────────────

  // Build per-card annual spend map
  const annualSpendByCard: Record<string, number> = {}
  for (const tx of annualTxns) {
    annualSpendByCard[tx.cardId] = (annualSpendByCard[tx.cardId] ?? 0) + (tx.amountUsd ?? 0)
  }

  const cardStates: CardLiveState[] = cards.map(card => {
    const limit = card.credit_limit ?? null
    const owed = card.current_balance_owed ?? 0
    const available = limit !== null ? limit - owed : null
    const utilization = limit ? (owed / limit) * 100 : null

    // Cap progress per category
    const categoryCapProgress = (card.rewards_structure.fixed_categories ?? [])
      .filter((fc: any) => fc.cap_amount_usd !== null && fc.cap_amount_usd !== undefined)
      .map((fc: any) => ({
        category: fc.category,
        spentTowardsCap: fc.current_spend_towards_cap ?? 0,
        capLimit: fc.cap_amount_usd ?? null,
        remainingCapRoom: fc.cap_amount_usd !== null && fc.cap_amount_usd !== undefined
          ? fc.cap_amount_usd - (fc.current_spend_towards_cap ?? 0)
          : null,
      }))

    // Points value — for USD cards use credit_token_balance * op_cents_per_token
    const pointsBalance = card.points_balance ?? 0
    let pointsValueUsd: number
    if (card.currency_type === 'USD' && card.op_redemption && (card.credit_token_balance ?? 0) > 0) {
      pointsValueUsd = parseFloat(
        ((card.credit_token_balance ?? 0) * (card.op_redemption.op_cents_per_token / 100)).toFixed(2)
      )
    } else {
      pointsValueUsd = parseFloat((pointsBalance * ((card.points_value_cents ?? 100) / 100)).toFixed(2))
    }

    // OP token state (USD cards with op_redemption configured)
    let opTokenState: CardLiveState['opTokenState'] = null
    if (card.currency_type === 'USD' && card.op_redemption) {
      const tokenBalance = card.credit_token_balance ?? 0
      const centsPerToken = card.op_redemption.op_cents_per_token
      const minThreshold = card.op_redemption.min_redeem_tokens
      opTokenState = {
        tokenBalance,
        tokenValueUsd: parseFloat((tokenBalance * (centsPerToken / 100)).toFixed(2)),
        opCentsPerToken: centsPerToken,
        minRedeemThreshold: minThreshold,
        isTokenLow: tokenBalance < minThreshold,
      }
    }

    return {
      cardId: card.card_id,
      displayName: card.display_name,
      creditLimit: limit,
      currentBalanceOwed: owed,
      availableCredit: available,
      utilizationPct: utilization ? Math.round(utilization * 10) / 10 : null,
      standardAprPct: card.financials.standard_apr * 100,
      pointsBalance,
      pointsValueUsd,
      opTokenState,
      categoryCapProgress,
      // Fix: annualSpendUsd was dividing by 90 instead of using the raw 365-day total
      annualSpendUsd: parseFloat((annualSpendByCard[card.card_id] ?? 0).toFixed(2)),
    }
  })

  // ── Spending behaviour ────────────────────────────────────────────────────

  const totalSpend = txns.reduce((sum, t) => sum + (t.amountUsd ?? 0), 0)

  // Group by category (cross-card aggregate)
  const categoryMap:    Record<string, { total: number; count: number }> = {}
  const cardCategoryMap: Record<string, Record<string, { total: number; count: number }>> = {}
  const merchantMap:    Record<string, { total: number; count: number; categories: Record<string, number>; cardCounts: Record<string, number> }> = {}
  const cardMerchantMap: Record<string, Record<string, { total: number; count: number }>> = {}
  const monthBuckets:   Record<string, Record<string, number>> = {}
  let emiCount = 0

  for (const tx of txns) {
    const cat   = tx.category ?? 'other'
    const cid   = tx.cardId
    const m     = (tx.merchant ?? 'unknown').toLowerCase().trim()
    const month = (tx.createdAt as Date).toISOString().slice(0, 7)
    const amt   = tx.amountUsd ?? 0

    // cross-card category aggregate
    if (!categoryMap[cat]) {
categoryMap[cat] = { total: 0, count: 0 }
}
    categoryMap[cat].total += amt
    categoryMap[cat].count += 1
    if (tx.isEmi) {
emiCount++
}

    // per-card category
    if (!cardCategoryMap[cid]) {
cardCategoryMap[cid] = {}
}
    if (!cardCategoryMap[cid][cat]) {
cardCategoryMap[cid][cat] = { total: 0, count: 0 }
}
    cardCategoryMap[cid][cat].total += amt
    cardCategoryMap[cid][cat].count += 1

    // global merchant
    if (!merchantMap[m]) {
merchantMap[m] = { total: 0, count: 0, categories: {}, cardCounts: {} }
}
    merchantMap[m].total += amt
    merchantMap[m].count += 1
    merchantMap[m].categories[cat] = (merchantMap[m].categories[cat] ?? 0) + 1
    merchantMap[m].cardCounts[cid] = (merchantMap[m].cardCounts[cid] ?? 0) + 1

    // per-card merchant
    if (!cardMerchantMap[cid]) {
cardMerchantMap[cid] = {}
}
    if (!cardMerchantMap[cid][m]) {
cardMerchantMap[cid][m] = { total: 0, count: 0 }
}
    cardMerchantMap[cid][m].total += amt
    cardMerchantMap[cid][m].count += 1

    // monthly trend
    if (!monthBuckets[month]) {
monthBuckets[month] = {}
}
    monthBuckets[month][cat] = (monthBuckets[month][cat] ?? 0) + amt
  }

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, data]) => ({
      category,
      totalSpentUsd: parseFloat(data.total.toFixed(2)),
      txCount: data.count,
      sharePct: totalSpend > 0 ? Math.round((data.total / totalSpend) * 1000) / 10 : 0,
      avgTxSizeUsd: parseFloat((data.total / data.count).toFixed(2)),
    }))
    .sort((a, b) => b.totalSpentUsd - a.totalSpentUsd)

  const cardCategoryBreakdown: SpendingBehaviour['cardCategoryBreakdown'] = {}

  for (const [cid, catMap] of Object.entries(cardCategoryMap)) {
    const cardTotal = Object.values(catMap).reduce((s, v) => s + v.total, 0)
    cardCategoryBreakdown[cid] = Object.entries(catMap)
      .map(([category, data]) => ({
        category,
        totalSpentUsd: parseFloat(data.total.toFixed(2)),
        txCount: data.count,
        sharePct: cardTotal > 0 ? Math.round((data.total / cardTotal) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalSpentUsd - a.totalSpentUsd)
  }

  const topMerchants = Object.entries(merchantMap)
    .map(([merchant, data]) => ({
      merchant,
      totalSpentUsd: parseFloat(data.total.toFixed(2)),
      txCount: data.count,
      category: Object.entries(data.categories).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other',
      primaryCardId: Object.entries(data.cardCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '',
    }))
    .sort((a, b) => b.txCount - a.txCount)
    .slice(0, 10)

  const cardTopMerchants: SpendingBehaviour['cardTopMerchants'] = {}
  for (const [cid, mMap] of Object.entries(cardMerchantMap)) {
    cardTopMerchants[cid] = Object.entries(mMap)
      .map(([merchant, data]) => ({
        merchant,
        totalSpentUsd: parseFloat(data.total.toFixed(2)),
        txCount: data.count,
      }))
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, 5)
  }

  const monthlyTrend = Object.entries(monthBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, catMap]) => {
      const monthTotal = Object.values(catMap).reduce((s, v) => s + v, 0)
      return {
        month,
        totalSpentUsd: parseFloat(monthTotal.toFixed(2)),
        categoryBreakdown: Object.entries(catMap)
          .map(([category, total]) => ({
            category,
            totalSpentUsd: parseFloat(total.toFixed(2)),
            sharePct: monthTotal > 0 ? Math.round((total / monthTotal) * 1000) / 10 : 0,
          }))
          .sort((a, b) => b.totalSpentUsd - a.totalSpentUsd),
      }
    })

  // MoM change
  let momSpendChangePct: number | null = null
  let fastestGrowingCategory: string | null = null

  if (monthlyTrend.length >= 2) {
    const last = monthlyTrend[monthlyTrend.length - 1]
    const prev = monthlyTrend[monthlyTrend.length - 2]
    momSpendChangePct = prev.totalSpentUsd > 0
      ? Math.round(((last.totalSpentUsd - prev.totalSpentUsd) / prev.totalSpentUsd) * 1000) / 10
      : null

    const lastCatMap = Object.fromEntries(last.categoryBreakdown.map(c => [c.category, c.totalSpentUsd]))
    const prevCatMap = Object.fromEntries(prev.categoryBreakdown.map(c => [c.category, c.totalSpentUsd]))
    const growthByCategory = Object.entries(lastCatMap)
      .map(([cat, lastAmt]) => ({ cat, growth: lastAmt - (prevCatMap[cat] ?? 0) }))
      .sort((a, b) => b.growth - a.growth)
    fastestGrowingCategory = growthByCategory[0]?.growth > 0 ? growthByCategory[0].cat : null
  }

  // Dynamic month count
  const earliestTx = txns.length > 0
    ? new Date(Math.min(...txns.map(t => new Date(t.createdAt as Date).getTime())))
    : since
  const actualMonths = Math.max(1, (Date.now() - earliestTx.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  const monthlyAvgSpendUsd = parseFloat((totalSpend / actualMonths).toFixed(2))

  // CPP from actual redemption transactions
  const totalPointsRedeemed90d = redemptionTxns.reduce((s, t) => s + (t.pointsRedeemed ?? 0), 0)
  const totalValueReceived90d = redemptionTxns.reduce((s, t) => s + (t.valueReceivedUsd ?? 0), 0)

  const actualAvgCppAchieved = totalPointsRedeemed90d > 0
    ? Math.round((totalValueReceived90d / totalPointsRedeemed90d) * 10000) / 100
    : null

  const redemptionCount90d = redemptionTxns.length

  const topCategory = categoryBreakdown[0]?.category ?? 'shopping'

  const getShare = (cat: string) =>
    categoryBreakdown.find(c => c.category === cat)?.sharePct ?? 0

  const behaviour: SpendingBehaviour = {
    categoryBreakdown,
    cardCategoryBreakdown,
    topMerchants,
    cardTopMerchants,
    topCategory,
    isFrequentTraveller: getShare('travel') > 15,
    isFrequentDiner: getShare('dining') > 12,
    isOnlineShopper: (getShare('shopping') + getShare('electronics')) > 20,
    isGroceryDominant: getShare('grocery') > 20,
    monthlyAvgSpendUsd,
    monthlyTrend,
    momSpendChangePct,
    fastestGrowingCategory,
    actualAvgCppAchieved,
    totalPointsRedeemed90d,
    redemptionCount90d,
    emiTransactionPct: txns.length > 0 ? Math.round((emiCount / txns.length) * 100) : 0,
  }

  // ── Cross-card OP token totals ─────────────────────────────────────────────
  const totalOpTokens = cardStates.reduce(
    (sum, c) => sum + (c.opTokenState?.tokenBalance ?? 0), 0
  )
  const totalOpBalanceUsd = parseFloat(
    cardStates.reduce((sum, c) => sum + (c.opTokenState?.tokenValueUsd ?? 0), 0).toFixed(2)
  )

  return { userId, cards: cardStates, behaviour, totalOpTokens, totalOpBalanceUsd }
}