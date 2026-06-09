// lib/userContext/transactionAggregation.ts
//
// Helper functions for aggregating transaction data

import { TransactionLean } from './types';

export type MerchantEntry = {
  total: number
  count: number
  categories: Record<string, number>
  cardCounts: Record<string, number>
}

interface AggregationMaps {
  categoryMap: Record<string, { total: number; count: number }>
  cardCategoryMap: Record<string, Record<string, { total: number; count: number }>>
  merchantMap: Record<string, MerchantEntry>
  cardMerchantMap: Record<string, Record<string, { total: number; count: number }>>
  monthBuckets: Record<string, Record<string, number>>
  installmentCount: number
}

function initializeAggregationMaps(): AggregationMaps {
  return {
    categoryMap: {},
    cardCategoryMap: {},
    merchantMap: {},
    cardMerchantMap: {},
    monthBuckets: {},
    installmentCount: 0,
  }
}

function updateCategoryMap(
  maps: AggregationMaps,
  category: string,
  amount: number
): void {
  maps.categoryMap[category] ??= { total: 0, count: 0 }
  const categoryEntry = maps.categoryMap[category]
  categoryEntry.total += amount
  categoryEntry.count += 1
}

function incrementInstallmentCount(maps: AggregationMaps): void {
  maps.installmentCount++
}

function updateCardCategoryMap(
  maps: AggregationMaps,
  cardId: string,
  category: string,
  amount: number
): void {
  maps.cardCategoryMap[cardId] ??= {}
  const cardCategoryMap = maps.cardCategoryMap[cardId]
  cardCategoryMap[category] ??= { total: 0, count: 0 }
  const cardCategoryEntry = cardCategoryMap[category]
  cardCategoryEntry.total += amount
  cardCategoryEntry.count += 1
}

function updateMerchantMap(
  maps: AggregationMaps,
  merchant: string,
  category: string,
  cardId: string,
  amount: number
): void {
  maps.merchantMap[merchant] ??= { total: 0, count: 0, categories: {}, cardCounts: {} }
  const merchantEntry = maps.merchantMap[merchant]
  merchantEntry.total += amount
  merchantEntry.count += 1
  merchantEntry.categories[category] = (merchantEntry.categories[category] ?? 0) + 1
  merchantEntry.cardCounts[cardId] = (merchantEntry.cardCounts[cardId] ?? 0) + 1
}

function updateCardMerchantMap(
  maps: AggregationMaps,
  cardId: string,
  merchant: string,
  amount: number
): void {
  maps.cardMerchantMap[cardId] ??= {}
  const cardMerchantMap = maps.cardMerchantMap[cardId]
  cardMerchantMap[merchant] ??= { total: 0, count: 0 }
  const cardMerchantEntry = cardMerchantMap[merchant]
  cardMerchantEntry.total += amount
  cardMerchantEntry.count += 1
}

function updateMonthBuckets(
  maps: AggregationMaps,
  month: string,
  category: string,
  amount: number
): void {
  maps.monthBuckets[month] ??= {}
  const monthBucket = maps.monthBuckets[month]
  monthBucket[category] = (monthBucket[category] ?? 0) + amount
}

export function processTransaction(transaction: TransactionLean, maps: AggregationMaps): void {
  const category = transaction.category ?? 'other'
  const cardId = transaction.cardId
  const merchant = (transaction.merchant ?? 'unknown').toLowerCase().trim()
  const month = (transaction.createdAt as Date).toISOString().slice(0, 7)
  const amount = transaction.amountUsd ?? 0

  updateCategoryMap(maps, category, amount)
  if (transaction.isEmi) {
    incrementInstallmentCount(maps)
  }
  updateCardCategoryMap(maps, cardId, category, amount)
  updateMerchantMap(maps, merchant, category, cardId, amount)
  updateCardMerchantMap(maps, cardId, merchant, amount)
  updateMonthBuckets(maps, month, category, amount)
}

export function initializeMaps(): AggregationMaps {
  return initializeAggregationMaps()
}
