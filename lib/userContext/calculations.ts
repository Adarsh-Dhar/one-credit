// lib/userContext/calculations.ts
//
// Calculation functions for user context building

import { TIME_CONSTANTS } from '@/lib/constants'
import type { TransactionLean, SpendingBehaviour } from './types'

const CALCULATION_CONSTANTS = {
  CPP_MULTIPLIER: 10000,
  CPP_DIVISOR: 100,
  SHARE_MULTIPLIER: 1000,
  SHARE_DIVISOR: 10,
  PERCENTAGE_MULTIPLIER: 100,
  TOP_MERCHANTS_LIMIT: 10,
  CARD_TOP_MERCHANTS_LIMIT: 5,
  MIN_MONTHS: 1,
} as const;

const MS_PER_MONTH = TIME_CONSTANTS.MILLISECONDS_PER_MONTH

export function computeRedemptionStats(redemptionTransactions: TransactionLean[]): {
  actualAvgCppAchieved: number | null
  totalPointsRedeemed90d: number
  redemptionCount90d: number
} {
  const totalPointsRedeemed90d = redemptionTransactions.reduce((s, t) => s + (t.pointsRedeemed ?? 0), 0)
  const totalValueReceived90d = redemptionTransactions.reduce((s, t) => s + (t.valueReceivedUsd ?? 0), 0)

  const actualAvgCppAchieved = totalPointsRedeemed90d > 0
    ? Math.round((totalValueReceived90d / totalPointsRedeemed90d) * CALCULATION_CONSTANTS.CPP_MULTIPLIER) / CALCULATION_CONSTANTS.CPP_DIVISOR
    : null

  const redemptionCount90d = redemptionTransactions.length

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
            sharePct: monthTotal > 0 ? Math.round((total / monthTotal) * CALCULATION_CONSTANTS.SHARE_MULTIPLIER) / CALCULATION_CONSTANTS.SHARE_DIVISOR : 0,
          }))
          .sort((a, b) => b.totalSpentUsd - a.totalSpentUsd),
      }
    })

  let momSpendChangePct: number | null = null
  let fastestGrowingCategory: string | null = null

  if (monthlyTrend.length >= 2) {
    const last = monthlyTrend[monthlyTrend.length - 1]
    const prev = monthlyTrend[monthlyTrend.length - 2]
    momSpendChangePct = calculateMonthOverMonthChange(last, prev)
    fastestGrowingCategory = calculateFastestGrowingCategory(last, prev)
  }

  return { monthlyTrend, momSpendChangePct, fastestGrowingCategory }
}

function calculateMonthOverMonthChange(
  current: SpendingBehaviour['monthlyTrend'][number],
  previous: SpendingBehaviour['monthlyTrend'][number]
): number | null {
  if (previous.totalSpentUsd === 0) {
    return null
  }
  return Math.round(((current.totalSpentUsd - previous.totalSpentUsd) / previous.totalSpentUsd) * CALCULATION_CONSTANTS.SHARE_MULTIPLIER) / CALCULATION_CONSTANTS.SHARE_DIVISOR
}

function calculateFastestGrowingCategory(
  current: SpendingBehaviour['monthlyTrend'][number],
  previous: SpendingBehaviour['monthlyTrend'][number]
): string | null {
  const toCatMap = (b: SpendingBehaviour['monthlyTrend'][number]) =>
    Object.fromEntries(b.categoryBreakdown.map(c => [c.category, c.totalSpentUsd]))
  const currentCatMap = toCatMap(current)
  const previousCatMap = toCatMap(previous)
  const growthByCategory = Object.entries(currentCatMap)
    .map(([category, currentAmt]) => ({ category, growth: currentAmt - (previousCatMap[category] ?? 0) }))
    .sort((a, b) => b.growth - a.growth)
  return growthByCategory[0]?.growth > 0 ? growthByCategory[0].category : null
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
        sharePct: cardTotal > 0 ? Math.round((data.total / cardTotal) * CALCULATION_CONSTANTS.SHARE_MULTIPLIER) / CALCULATION_CONSTANTS.SHARE_DIVISOR : 0,
      }))
      .sort((a, b) => b.totalSpentUsd - a.totalSpentUsd)
  }
  return result
}

function keyWithHighestCount(counts: Record<string, number>): string | undefined {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
}

function buildCategoryBreakdown(
  categoryMap: Record<string, { total: number; count: number }>,
  totalSpend: number
): SpendingBehaviour['categoryBreakdown'] {
  return Object.entries(categoryMap)
    .map(([category, data]) => ({
      category,
      totalSpentUsd: parseFloat(data.total.toFixed(2)),
      txCount: data.count,
      sharePct: totalSpend > 0 ? Math.round((data.total / totalSpend) * CALCULATION_CONSTANTS.SHARE_MULTIPLIER) / CALCULATION_CONSTANTS.SHARE_DIVISOR : 0,
      avgTxSizeUsd: parseFloat((data.total / data.count).toFixed(2)),
    }))
    .sort((a, b) => b.totalSpentUsd - a.totalSpentUsd)
}

function buildTopMerchants(
  merchantMap: Record<string, { total: number; count: number; categories: Record<string, number>; cardCounts: Record<string, number> }>
): SpendingBehaviour['topMerchants'] {
  return Object.entries(merchantMap)
    .map(([merchant, data]) => ({
      merchant,
      totalSpentUsd: parseFloat(data.total.toFixed(2)),
      txCount: data.count,
      category: keyWithHighestCount(data.categories) ?? 'other',
      primaryCardId: keyWithHighestCount(data.cardCounts) ?? '',
    }))
    .sort((a, b) => b.txCount - a.txCount)
    .slice(0, CALCULATION_CONSTANTS.TOP_MERCHANTS_LIMIT)
}

function buildCardTopMerchants(
  cardMerchantMap: Record<string, Record<string, { total: number; count: number }>>
): SpendingBehaviour['cardTopMerchants'] {
  const cardTopMerchants: SpendingBehaviour['cardTopMerchants'] = {}
  for (const [cardId, merchantMap] of Object.entries(cardMerchantMap)) {
    cardTopMerchants[cardId] = Object.entries(merchantMap)
      .map(([merchant, data]) => ({
        merchant,
        totalSpentUsd: parseFloat(data.total.toFixed(2)),
        txCount: data.count,
      }))
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, CALCULATION_CONSTANTS.CARD_TOP_MERCHANTS_LIMIT)
  }
  return cardTopMerchants
}

function calculateMonthlyAverageSpend(totalSpend: number, earliestTx: Date): number {
  const actualMonths = Math.max(CALCULATION_CONSTANTS.MIN_MONTHS, (Date.now() - earliestTx.getTime()) / MS_PER_MONTH)
  return parseFloat((totalSpend / actualMonths).toFixed(2))
}

function getCategoryShare(category: string, categoryBreakdown: SpendingBehaviour['categoryBreakdown']): number {
  return categoryBreakdown.find(c => c.category === category)?.sharePct ?? 0
}

export function aggregateSpendingBehaviour(transactions: TransactionLean[], totalSpend: number): {
  categoryBreakdown: SpendingBehaviour['categoryBreakdown']
  cardCategoryBreakdown: SpendingBehaviour['cardCategoryBreakdown']
  topMerchants: SpendingBehaviour['topMerchants']
  cardTopMerchants: SpendingBehaviour['cardTopMerchants']
  monthBuckets: Record<string, Record<string, number>>
  monthlyInstallmentTransactionPct: number
} {
  const { initializeMaps, processTransaction } = require('./transactionAggregation')
  const maps = initializeMaps()

  for (const transaction of transactions) {
    processTransaction(transaction, maps)
  }

  const categoryBreakdown = buildCategoryBreakdown(maps.categoryMap, totalSpend)
  const cardCategoryBreakdown = buildCardCategoryBreakdown(maps.cardCategoryMap)
  const topMerchants = buildTopMerchants(maps.merchantMap)
  const cardTopMerchants = buildCardTopMerchants(maps.cardMerchantMap)
  const monthlyInstallmentTransactionPct = transactions.length > 0 ? Math.round((maps.installmentCount / transactions.length) * CALCULATION_CONSTANTS.PERCENTAGE_MULTIPLIER) : 0

  return {
    categoryBreakdown, cardCategoryBreakdown,
    topMerchants, cardTopMerchants,
    monthBuckets: maps.monthBuckets, monthlyInstallmentTransactionPct,
  }
}

export function deriveLifestyleSignals(data: {
  categoryBreakdown: SpendingBehaviour['categoryBreakdown']
  cardCategoryBreakdown: SpendingBehaviour['cardCategoryBreakdown']
  topMerchants: SpendingBehaviour['topMerchants']
  cardTopMerchants: SpendingBehaviour['cardTopMerchants']
  monthlyInstallmentTransactionPct: number
  monthlyTrend: SpendingBehaviour['monthlyTrend']
  momSpendChangePct: number | null
  fastestGrowingCategory: string | null
  earliestTx: Date
  totalSpend: number
  actualAvgCppAchieved: number | null
  totalPointsRedeemed90d: number
  redemptionCount90d: number
}, thresholds: {
  FREQUENT_TRAVEL_THRESHOLD_PCT: number
  FREQUENT_DINER_THRESHOLD_PCT: number
  ONLINE_SHOPPER_THRESHOLD_PCT: number
  GROCERY_DOMINANT_THRESHOLD_PCT: number
}): SpendingBehaviour {
  const {
    categoryBreakdown,
    cardCategoryBreakdown,
    topMerchants,
    cardTopMerchants,
    monthlyInstallmentTransactionPct,
    monthlyTrend,
    momSpendChangePct,
    fastestGrowingCategory,
    earliestTx,
    totalSpend,
    actualAvgCppAchieved,
    totalPointsRedeemed90d,
    redemptionCount90d,
  } = data

  const monthlyAvgSpendUsd = calculateMonthlyAverageSpend(totalSpend, earliestTx)
  const topCategory = categoryBreakdown[0]?.category ?? 'shopping'
  const getShare = (cat: string) => getCategoryShare(cat, categoryBreakdown)

  return {
    categoryBreakdown,
    cardCategoryBreakdown,
    topMerchants,
    cardTopMerchants,
    topCategory,
    isFrequentTraveller: getShare('travel') > thresholds.FREQUENT_TRAVEL_THRESHOLD_PCT,
    isFrequentDiner: getShare('dining') > thresholds.FREQUENT_DINER_THRESHOLD_PCT,
    isOnlineShopper: (getShare('shopping') + getShare('electronics')) > thresholds.ONLINE_SHOPPER_THRESHOLD_PCT,
    isGroceryDominant: getShare('grocery') > thresholds.GROCERY_DOMINANT_THRESHOLD_PCT,
    monthlyAvgSpendUsd,
    monthlyTrend,
    momSpendChangePct,
    fastestGrowingCategory,
    actualAvgCppAchieved,
    totalPointsRedeemed90d,
    redemptionCount90d,
    monthlyInstallmentTransactionPct,
  }
}
