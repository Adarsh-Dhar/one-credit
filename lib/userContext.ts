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
  availableCredit: number | null        // creditLimit - currentBalanceOwed
  utilizationPct: number | null         // currentBalanceOwed / creditLimit * 100
  standardAprPct: number                // e.g. 42 = 42% APR

  // Existing rewards
  pointsBalance: number                 // points/miles already in account
  pointsValueInr: number                // what those points are worth right now

  // Category cap progress this month
  categoryCapProgress: {
    category: string
    spentTowardsCap: number
    capLimit: number | null
    remainingCapRoom: number | null
  }[]
  annualSpendInr: number   // total spend on this card in last 365 days
}

export interface SpendingBehaviour {
  // Last 90 days category breakdown (% of total spend)
  categoryBreakdown: {
    category: string
    totalSpentInr: number
    txCount: number
    sharePct: number                    // % of total spend
    avgTxSizeInr: number
  }[]

  // Lifestyle signals
  topCategory: string                   // biggest spend category
  isFrequentTraveller: boolean          // travel > 15% of spend
  isFrequentDiner: boolean              // dining > 12% of spend
  isOnlineShopper: boolean              // shopping/electronics > 20% of spend
  isGroceryDominant: boolean            // grocery > 20% of spend
  monthlyAvgSpendInr: number

  // Redemption behaviour
  actualAvgCppAchieved: number | null   // avg CPP user has actually redeemed at historically
                                        // null if no redemption history

  // EMI behaviour
  emiTransactionPct: number             // % of high-value txns done as EMI
}

export interface UserContext {
  userId: string
  cards: CardLiveState[]
  behaviour: SpendingBehaviour
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export async function buildUserContext(userId: string): Promise<UserContext> {
  await connectDB()

  // 1. Fetch all cards
  const cards = await FiatCard.find({ user_id: userId }).lean()

  // 2. Fetch last 90 days of transactions
  const since = new Date()
  since.setDate(since.getDate() - 90)
  const txns = await Transaction.find({
    userId,
    type: 'spend',
    createdAt: { $gte: since },
  }).lean()

  // 2b. Fetch last 365 days of transactions for annual spend
  const since365 = new Date()
  since365.setDate(since365.getDate() - 365)
  const annualTxns = await Transaction.find({
    userId,
    type: 'spend',
    createdAt: { $gte: since365 },
  }).lean()

  // ── Card live states ──────────────────────────────────────────────────────

  // Build per-card annual spend map
  const annualSpendByCard: Record<string, number> = {}
  for (const tx of annualTxns) {
    annualSpendByCard[tx.cardId] = (annualSpendByCard[tx.cardId] ?? 0) + (tx.amountInr ?? 0)
  }

  const cardStates: CardLiveState[] = cards.map(card => {
    const limit = card.credit_limit ?? null
    const owed = card.current_balance_owed ?? 0
    const available = limit !== null ? limit - owed : null
    const utilization = limit ? (owed / limit) * 100 : null

    // Cap progress per category
    const categoryCapProgress = (card.rewards_structure.fixed_categories ?? [])
      .filter(fc => fc.cap_amount_usd !== null && fc.cap_amount_usd !== undefined)
      .map(fc => ({
        category: fc.category,
        spentTowardsCap: fc.current_spend_towards_cap ?? 0,
        capLimit: fc.cap_amount_usd ?? null,
        remainingCapRoom: fc.cap_amount_usd !== null && fc.cap_amount_usd !== undefined
          ? fc.cap_amount_usd - (fc.current_spend_towards_cap ?? 0)
          : null,
      }))

    // Points value
    const pointsBalance = card.points_balance ?? 0
    const pointsValueInr = pointsBalance * ((card.points_value_cents ?? 100) / 100)

    return {
      cardId: card.card_id,
      displayName: card.display_name,
      creditLimit: limit,
      currentBalanceOwed: owed,
      availableCredit: available,
      utilizationPct: utilization ? Math.round(utilization * 10) / 10 : null,
      standardAprPct: card.financials.standard_apr,
      pointsBalance,
      pointsValueInr: Math.round(pointsValueInr),
      categoryCapProgress,
      annualSpendInr: Math.round(annualSpendByCard[card.card_id] ?? 0),
    }
  })

  // ── Spending behaviour ────────────────────────────────────────────────────

  const totalSpend = txns.reduce((sum, t) => sum + (t.amountInr ?? 0), 0)
  const monthlyAvgSpendInr = txns.length > 0 ? Math.round(totalSpend / 3) : 0

  // Group by category
  const categoryMap: Record<string, { total: number; count: number }> = {}
  let emiCount = 0

  for (const tx of txns) {
    const cat = tx.category ?? 'other'
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 }
    categoryMap[cat].total += tx.amountInr ?? 0
    categoryMap[cat].count += 1
    if (tx.isEmi) emiCount++
  }

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, data]) => ({
      category,
      totalSpentInr: Math.round(data.total),
      txCount: data.count,
      sharePct: totalSpend > 0 ? Math.round((data.total / totalSpend) * 100 * 10) / 10 : 0,
      avgTxSizeInr: Math.round(data.total / data.count),
    }))
    .sort((a, b) => b.totalSpentInr - a.totalSpentInr)

  const topCategory = categoryBreakdown[0]?.category ?? 'shopping'

  const getShare = (cat: string) =>
    categoryBreakdown.find(c => c.category === cat)?.sharePct ?? 0

  // Actual CPP achieved from past redemptions
  const redemptions = txns.filter(t => (t.rewardValueInr ?? 0) > 0 && (t.pointsEarned ?? 0) > 0)
  const actualAvgCpp = redemptions.length > 0
    ? redemptions.reduce((sum, t) => sum + (t.rewardValueInr / t.pointsEarned), 0) / redemptions.length
    : null

  const behaviour: SpendingBehaviour = {
    categoryBreakdown,
    topCategory,
    isFrequentTraveller: getShare('travel') > 15,
    isFrequentDiner: getShare('dining') > 12,
    isOnlineShopper: (getShare('shopping') + getShare('electronics')) > 20,
    isGroceryDominant: getShare('grocery') > 20,
    monthlyAvgSpendInr,
    actualAvgCppAchieved: actualAvgCpp ? Math.round(actualAvgCpp * 100) / 100 : null,
    emiTransactionPct: txns.length > 0 ? Math.round((emiCount / txns.length) * 100) : 0,
  }

  return { userId, cards: cardStates, behaviour }
}
