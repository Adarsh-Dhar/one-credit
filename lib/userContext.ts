// lib/userContext.ts
//
// Builds a complete user context object from:
//   - card balances (credit limit, available credit, points balance, APR)
//   - transaction history (spending behaviour, category breakdown, cap progress)
//
// This is fed into the OP agent prompt so Gemini reasons over the
// REAL user, not a hypothetical optimal user.

import { connectDB } from '@/lib/mongodb'
import { FiatCard, IFiatCard } from '@/lib/models/FiatCard'
import { Transaction } from '@/lib/models/Transaction'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransactionLean {
  cardId: string
  amountUsd: number
  category: string
  merchant: string
  createdAt: Date
  isEmi?: boolean
  pointsRedeemed?: number
  valueReceivedUsd?: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BEHAVIOUR_WINDOW_DAYS = 90
const ANNUAL_WINDOW_DAYS = 365
const AVG_DAYS_PER_MONTH = 30.44
const FREQUENT_TRAVEL_THRESHOLD_PCT = 15
const FREQUENT_DINER_THRESHOLD_PCT = 12
const ONLINE_SHOPPER_THRESHOLD_PCT = 20
const GROCERY_DOMINANT_THRESHOLD_PCT = 20

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

// ─── Helper Functions ───────────────────────────────────────────────────────

type MerchantEntry = {
  total: number
  count: number
  categories: Record<string, number>
  cardCounts: Record<string, number>
}

function buildCardLiveStates(
  cards: IFiatCard[],
  annualSpendByCard: Record<string, number>
): CardLiveState[] {
  return cards.map(card => {
    const limit = card.credit_limit ?? null
    const owed = card.current_balance_owed ?? 0
    const available = limit !== null ? limit - owed : null
    const utilization = limit ? (owed / limit) * 100 : null

    const categoryCapProgress = (card.rewards_structure.fixed_categories ?? [])
      .filter((fc) => fc.cap_amount_usd !== null && fc.cap_amount_usd !== undefined)
      .map((fc) => ({
        category: fc.category,
        spentTowardsCap: fc.current_spend_towards_cap ?? 0,
        capLimit: fc.cap_amount_usd ?? null,
        remainingCapRoom: fc.cap_amount_usd !== null && fc.cap_amount_usd !== undefined
          ? fc.cap_amount_usd - (fc.current_spend_towards_cap ?? 0)
          : null,
      }))

    const pointsBalance = card.points_balance ?? 0
    let pointsValueUsd: number
    if (card.currency_type === 'USD' && card.op_redemption && (card.credit_token_balance ?? 0) > 0) {
      pointsValueUsd = parseFloat(
        ((card.credit_token_balance ?? 0) * (card.op_redemption.op_cents_per_token / 100)).toFixed(2)
      )
    } else {
      pointsValueUsd = parseFloat((pointsBalance * ((card.points_value_cents ?? 100) / 100)).toFixed(2))
    }

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
      annualSpendUsd: parseFloat((annualSpendByCard[card.card_id] ?? 0).toFixed(2)),
    }
  })
}

function computeOpTotals(cardStates: CardLiveState[]): { totalOpTokens: number; totalOpBalanceUsd: number } {
  let totalOpTokens = 0
  let totalOpBalanceUsd = 0

  for (const card of cardStates) {
    if (card.opTokenState) {
      totalOpTokens += card.opTokenState.tokenBalance
      totalOpBalanceUsd += card.opTokenState.tokenValueUsd
    }
  }

  return { totalOpTokens, totalOpBalanceUsd }
}

export function computeRedemptionStats(redemptionTxns: TransactionLean[]): {
  actualAvgCppAchieved: number | null
  totalPointsRedeemed90d: number
  redemptionCount90d: number
} {
  const totalPointsRedeemed90d = redemptionTxns.reduce((s, t) => s + (t.pointsRedeemed ?? 0), 0)
  const totalValueReceived90d = redemptionTxns.reduce((s, t) => s + (t.valueReceivedUsd ?? 0), 0)

  const actualAvgCppAchieved = totalPointsRedeemed90d > 0
    ? Math.round((totalValueReceived90d / totalPointsRedeemed90d) * 10000) / 100
    : null

  const redemptionCount90d = redemptionTxns.length

  return { actualAvgCppAchieved, totalPointsRedeemed90d, redemptionCount90d }
}

export function computeMonthlyTrend(monthBuckets: Record<string, Record<string, number>>): {
  monthlyTrend: SpendingBehaviour['monthlyTrend']
  momSpendChangePct: number | null
  fastestGrowingCategory: string | null
} {
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
      .map(([category, lastAmt]) => ({ category, growth: lastAmt - (prevCatMap[category] ?? 0) }))
      .sort((a, b) => b.growth - a.growth)
    fastestGrowingCategory = growthByCategory[0]?.growth > 0 ? growthByCategory[0].category : null
  }

  return { monthlyTrend, momSpendChangePct, fastestGrowingCategory }
}

export function buildCardCategoryBreakdown(
  cardCategoryMap: Record<string, Record<string, { total: number; count: number }>>
): SpendingBehaviour['cardCategoryBreakdown'] {
  const result: SpendingBehaviour['cardCategoryBreakdown'] = {}
  for (const [cardId, catMap] of Object.entries(cardCategoryMap)) {
    const cardTotal = Object.values(catMap).reduce((s, v) => s + v.total, 0)
    result[cardId] = Object.entries(catMap)
      .map(([category, data]) => ({
        category,
        totalSpentUsd: parseFloat(data.total.toFixed(2)),
        txCount: data.count,
        sharePct: cardTotal > 0 ? Math.round((data.total / cardTotal) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalSpentUsd - a.totalSpentUsd)
  }
  return result
}

function topKey(counts: Record<string, number>): string | undefined {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
}

function aggregateSpendingBehaviour(txns: TransactionLean[], totalSpend: number): {
  categoryBreakdown: SpendingBehaviour['categoryBreakdown']
  cardCategoryBreakdown: SpendingBehaviour['cardCategoryBreakdown']
  topMerchants: SpendingBehaviour['topMerchants']
  cardTopMerchants: SpendingBehaviour['cardTopMerchants']
  monthBuckets: Record<string, Record<string, number>>
  emiTransactionPct: number
} {
  // Group by category (cross-card aggregate)
  const categoryMap: Record<string, { total: number; count: number }> = {}
  const cardCategoryMap: Record<string, Record<string, { total: number; count: number }>> = {}
  const merchantMap: Record<string, MerchantEntry> = {}
  const cardMerchantMap: Record<string, Record<string, { total: number; count: number }>> = {}
  const monthBuckets: Record<string, Record<string, number>> = {}
  let emiCount = 0

  for (const tx of txns) {
    const category = tx.category ?? 'other'
    const cardId = tx.cardId
    const merchant = (tx.merchant ?? 'unknown').toLowerCase().trim()
    const month = (tx.createdAt as Date).toISOString().slice(0, 7)
    const amt = tx.amountUsd ?? 0

    // cross-card category aggregate
    categoryMap[category] ??= { total: 0, count: 0 }
    categoryMap[category].total += amt
    categoryMap[category].count += 1
    if (tx.isEmi) {
      emiCount++
    }

    // per-card category
    cardCategoryMap[cardId] ??= {}
    const cardCatMap = cardCategoryMap[cardId]
    cardCatMap[category] ??= { total: 0, count: 0 }
    const cardCatEntry = cardCatMap[category]
    cardCatEntry.total += amt
    cardCatEntry.count += 1

    // global merchant
    merchantMap[merchant] ??= { total: 0, count: 0, categories: {}, cardCounts: {} }
    const merchantEntry = merchantMap[merchant]
    merchantEntry.total += amt
    merchantEntry.count += 1
    merchantEntry.categories[category] = (merchantEntry.categories[category] ?? 0) + 1
    merchantEntry.cardCounts[cardId] = (merchantEntry.cardCounts[cardId] ?? 0) + 1

    // per-card merchant
    cardMerchantMap[cardId] ??= {}
    const cardMerchMap = cardMerchantMap[cardId]
    cardMerchMap[merchant] ??= { total: 0, count: 0 }
    const cardMerchEntry = cardMerchMap[merchant]
    cardMerchEntry.total += amt
    cardMerchEntry.count += 1

    // monthly trend
    monthBuckets[month] ??= {}
    const monthBucket = monthBuckets[month]
    monthBucket[category] = (monthBucket[category] ?? 0) + amt
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

  const cardCategoryBreakdown = buildCardCategoryBreakdown(cardCategoryMap)

  const topMerchants = Object.entries(merchantMap)
    .map(([merchant, data]) => ({
      merchant,
      totalSpentUsd: parseFloat(data.total.toFixed(2)),
      txCount: data.count,
      category: topKey(data.categories) ?? 'other',
      primaryCardId: topKey(data.cardCounts) ?? '',
    }))
    .sort((a, b) => b.txCount - a.txCount)
    .slice(0, 10)

  const cardTopMerchants: SpendingBehaviour['cardTopMerchants'] = {}
  for (const [cardId, merchantMap] of Object.entries(cardMerchantMap)) {
    cardTopMerchants[cardId] = Object.entries(merchantMap)
      .map(([merchant, data]) => ({
        merchant,
        totalSpentUsd: parseFloat(data.total.toFixed(2)),
        txCount: data.count,
      }))
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, 5)
  }

  const emiTransactionPct = txns.length > 0 ? Math.round((emiCount / txns.length) * 100) : 0

  return { categoryBreakdown, cardCategoryBreakdown, topMerchants, cardTopMerchants, monthBuckets, emiTransactionPct }
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export async function buildUserContext(userId: string): Promise<UserContext> {
  await connectDB()
  const cards = await FiatCard.find({ user_id: userId })
    .select({ card_id:1, display_name:1, network:1, card_type:1, currency_type:1,
      credit_token_balance:1, points_balance:1, points_value_cents:1,
      current_balance_owed:1, credit_limit:1, rewards_structure:1,
      benefits_and_credits:1, financials:1, op_redemption:1 })
    .lean()

  const { txns, redemptionTxns, annualTxns, since } = await fetchTransactions(userId)
  return assembleContext(userId, cards, txns, redemptionTxns, annualTxns, since)
}

async function fetchTransactions(userId: string) {
  const since = new Date(Date.now() - BEHAVIOUR_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const annualSince = new Date(Date.now() - ANNUAL_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const [txns, redemptionTxns, annualTxns] = await Promise.all([
    Transaction.find({ userId, type: 'spend', createdAt: { $gte: since } })
      .select({ cardId: 1, amountUsd: 1, category: 1, merchant: 1, isEmi: 1, createdAt: 1 })
      .lean(),
    Transaction.find({ userId, type: 'redemption', createdAt: { $gte: since } })
      .select({ pointsRedeemed: 1, valueReceivedUsd: 1, createdAt: 1 })
      .lean(),
    Transaction.find({ userId, type: 'spend', createdAt: { $gte: annualSince } })
      .select({ cardId: 1, amountUsd: 1, createdAt: 1 })
      .lean(),
  ])

  return { txns, redemptionTxns, annualTxns, since }
}

function assembleContext(
  userId: string,
  cards: IFiatCard[],
  txns: TransactionLean[],
  redemptionTxns: TransactionLean[],
  annualTxns: TransactionLean[],
  since: Date
): UserContext {
  const annualSpendByCard: Record<string, number> = {}
  for (const tx of annualTxns) {
    annualSpendByCard[tx.cardId] = (annualSpendByCard[tx.cardId] ?? 0) + (tx.amountUsd ?? 0)
  }

  const cardStates = buildCardLiveStates(cards, annualSpendByCard)
  const totalSpend = txns.reduce((sum, t) => sum + (t.amountUsd ?? 0), 0)

  const { categoryBreakdown, cardCategoryBreakdown, topMerchants, cardTopMerchants, monthBuckets, emiTransactionPct } =
    aggregateSpendingBehaviour(txns, totalSpend)

  const { monthlyTrend, momSpendChangePct, fastestGrowingCategory } = computeMonthlyTrend(monthBuckets)

  const earliestTx = txns.length > 0
    ? new Date(Math.min(...txns.map(t => new Date(t.createdAt as Date).getTime())))
    : since
  const actualMonths = Math.max(1, (Date.now() - earliestTx.getTime()) / (1000 * 60 * 60 * 24 * AVG_DAYS_PER_MONTH))
  const monthlyAvgSpendUsd = parseFloat((totalSpend / actualMonths).toFixed(2))

  const { actualAvgCppAchieved, totalPointsRedeemed90d, redemptionCount90d } = computeRedemptionStats(redemptionTxns)
  const topCategory = categoryBreakdown[0]?.category ?? 'shopping'
  const getShare = (cat: string) => categoryBreakdown.find(c => c.category === cat)?.sharePct ?? 0

  const behaviour: SpendingBehaviour = {
    categoryBreakdown, cardCategoryBreakdown, topMerchants, cardTopMerchants, topCategory,
    isFrequentTraveller: getShare('travel') > FREQUENT_TRAVEL_THRESHOLD_PCT,
    isFrequentDiner: getShare('dining') > FREQUENT_DINER_THRESHOLD_PCT,
    isOnlineShopper: (getShare('shopping') + getShare('electronics')) > ONLINE_SHOPPER_THRESHOLD_PCT,
    isGroceryDominant: getShare('grocery') > GROCERY_DOMINANT_THRESHOLD_PCT,
    monthlyAvgSpendUsd, monthlyTrend, momSpendChangePct, fastestGrowingCategory,
    actualAvgCppAchieved, totalPointsRedeemed90d, redemptionCount90d, emiTransactionPct,
  }

  const { totalOpTokens, totalOpBalanceUsd } = computeOpTotals(cardStates)
  return { userId, cards: cardStates, behaviour, totalOpTokens, totalOpBalanceUsd }
}

export async function buildUserContextFromCards(userId: string, cards: IFiatCard[]): Promise<UserContext> {
  await connectDB()
  const { txns, redemptionTxns, annualTxns, since } = await fetchTransactions(userId)
  return assembleContext(userId, cards, txns, redemptionTxns, annualTxns, since)
}