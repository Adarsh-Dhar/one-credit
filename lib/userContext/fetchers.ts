// lib/userContext/fetchers.ts
//
// Data fetching functions for user context building

import { connectDB } from '@/lib/mongodb'
import { FiatCard, FIAT_CARD_PROJECTION } from '@/lib/models/FiatCard'
import { Transaction } from '@/lib/models/Transaction'
import { TIME_CONSTANTS, USER_CONTEXT_THRESHOLDS } from '@/lib/constants'

export async function fetchUserContextData(userId: string) {
  await connectDB()
  const cards = await FiatCard.find({ user_id: userId })
    .select({ ...FIAT_CARD_PROJECTION, op_redemption: 1 })
    .lean()

  const { transactions, redemptionTransactions, annualTransactions, since } = await fetchTransactions(userId)
  return { cards, transactions, redemptionTransactions, annualTransactions, since }
}

export async function fetchTransactions(userId: string) {
  const since = new Date(Date.now() - USER_CONTEXT_THRESHOLDS.BEHAVIOUR_WINDOW_DAYS * TIME_CONSTANTS.MILLISECONDS_PER_DAY)
  const annualSince = new Date(Date.now() - USER_CONTEXT_THRESHOLDS.ANNUAL_WINDOW_DAYS * TIME_CONSTANTS.MILLISECONDS_PER_DAY)

  const [transactions, redemptionTransactions, annualTransactions] = await Promise.all([
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

  return { transactions, redemptionTransactions, annualTransactions, since }
}
