// lib/userContext.ts
//
// Main entry point for user context building
// This file now serves as the main export point, delegating to specialized modules

import type { UserContext } from './userContext/types'
import type { IFiatCard } from './models/FiatCard'
import { fetchUserContextData, fetchTransactions } from './userContext/fetchers'
import { computeRedemptionStats, computeMonthlyTrend, aggregateSpendingBehaviour, deriveLifestyleSignals } from './userContext/calculations'
import { buildCardLiveStates, computeOpTotals } from './userContext/cardHelpers'
import { USER_CONTEXT_THRESHOLDS } from '@/lib/constants'
import type { TransactionLean } from './userContext/types'

// Re-export helper functions for backward compatibility
export { computeRedemptionStats, computeMonthlyTrend, aggregateSpendingBehaviour, deriveLifestyleSignals, buildCardCategoryBreakdown } from './userContext/calculations'
export { fetchUserContextData, fetchTransactions } from './userContext/fetchers'

// Helper method to reduce deep chaining
export function getUserActualAvgCpp(context: UserContext): number | null {
  return context.behaviour?.actualAvgCppAchieved ?? null
}

export async function buildUserContext(userId: string): Promise<UserContext> {
  const data = await fetchUserContextData(userId)
  return assembleContext({ userId, ...data })
}

interface AssembleContextParams {
  userId: string
  cards: IFiatCard[]
  transactions: TransactionLean[]
  redemptionTransactions: TransactionLean[]
  annualTransactions: TransactionLean[]
  since: Date
}

interface AggregatedContextData {
  cardStates: any[]
  totalSpend: number
  categoryBreakdown: any
  cardCategoryBreakdown: any
  topMerchants: any
  cardTopMerchants: any
  monthBuckets: Record<string, Record<string, number>>
  monthlyInstallmentTransactionPct: number
  monthlyTrend: any
  momSpendChangePct: number | null
  fastestGrowingCategory: string | null
  earliestTx: Date
  since: Date
  actualAvgCppAchieved: number | null
  totalPointsRedeemed90d: number
  redemptionCount90d: number
}

function calculateAnnualSpendByCard(annualTransactions: TransactionLean[]): Record<string, number> {
  const annualSpendByCard: Record<string, number> = {}
  for (const transaction of annualTransactions) {
    annualSpendByCard[transaction.cardId] = (annualSpendByCard[transaction.cardId] ?? 0) + (transaction.amountUsd ?? 0)
  }
  return annualSpendByCard
}

function calculateTotalSpend(transactions: TransactionLean[]): number {
  return transactions.reduce((sum: number, transaction: TransactionLean) => sum + (transaction.amountUsd ?? 0), 0)
}

function findEarliestTransaction(transactions: TransactionLean[], since: Date): Date {
  if (transactions.length === 0) {
    return since
  }
  return new Date(Math.min(...transactions.map((t: TransactionLean) => new Date(t.createdAt as Date).getTime())))
}

function aggregateContextData(params: AssembleContextParams): AggregatedContextData {
  const { cards, transactions, redemptionTransactions, annualTransactions, since } = params

  const annualSpendByCard = calculateAnnualSpendByCard(annualTransactions)
  const cardStates = buildCardLiveStates(cards, annualSpendByCard)
  const totalSpend = calculateTotalSpend(transactions)

  const {
    categoryBreakdown, cardCategoryBreakdown,
    topMerchants, cardTopMerchants,
    monthBuckets, monthlyInstallmentTransactionPct,
  } = aggregateSpendingBehaviour(transactions, totalSpend)

  const {
    monthlyTrend,
    momSpendChangePct,
    fastestGrowingCategory,
  } = computeMonthlyTrend(monthBuckets)

  const earliestTx = findEarliestTransaction(transactions, since)

  const {
    actualAvgCppAchieved,
    totalPointsRedeemed90d,
    redemptionCount90d,
  } = computeRedemptionStats(redemptionTransactions)

  return {
    cardStates,
    totalSpend,
    categoryBreakdown,
    cardCategoryBreakdown,
    topMerchants,
    cardTopMerchants,
    monthBuckets,
    monthlyInstallmentTransactionPct,
    monthlyTrend,
    momSpendChangePct,
    fastestGrowingCategory,
    earliestTx,
    since,
    actualAvgCppAchieved,
    totalPointsRedeemed90d,
    redemptionCount90d,
  }
}

function assembleContext(params: AssembleContextParams): UserContext {
  const { userId } = params
  const aggregatedData = aggregateContextData(params)
  const behaviour = deriveLifestyleSignals(aggregatedData, USER_CONTEXT_THRESHOLDS)
  const { totalOpTokens, totalOpBalanceUsd } = computeOpTotals(aggregatedData.cardStates)
  return { userId, cards: aggregatedData.cardStates, behaviour, totalOpTokens, totalOpBalanceUsd }
}

export async function buildUserContextFromCards(userId: string, cards: IFiatCard[]): Promise<UserContext> {
  const { transactions, redemptionTransactions, annualTransactions, since } = await fetchTransactions(userId)
  return assembleContext({ userId, cards, transactions, redemptionTransactions, annualTransactions, since })
}