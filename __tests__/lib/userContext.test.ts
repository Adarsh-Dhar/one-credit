// __tests__/lib/userContext.test.ts
//
// Unit tests for pure helper functions in lib/userContext.ts
// These functions require zero mocking as they are pure data transformations

import { describe, it, expect } from '@jest/globals'
import {
  computeRedemptionStats,
  computeMonthlyTrend,
  buildCardCategoryBreakdown,
} from '@/lib/userContext'

describe('computeRedemptionStats', () => {
  it('should return null for actualAvgCppAchieved when no transactions', () => {
    const result = computeRedemptionStats([])
    expect(result).toEqual({
      actualAvgCppAchieved: null,
      totalPointsRedeemed90d: 0,
      redemptionCount90d: 0,
    })
  })

  it('should calculate stats for single redemption transaction', () => {
    const txns = [
      { pointsRedeemed: 1000, valueReceivedUsd: 10 },
    ] as any
    const result = computeRedemptionStats(txns)
    expect(result).toEqual({
      actualAvgCppAchieved: 1.0,
      totalPointsRedeemed90d: 1000,
      redemptionCount90d: 1,
    })
  })

  it('should calculate stats for multiple redemption transactions', () => {
    const txns = [
      { pointsRedeemed: 1000, valueReceivedUsd: 10 },
      { pointsRedeemed: 2000, valueReceivedUsd: 25 },
    ] as any
    const result = computeRedemptionStats(txns)
    expect(result).toEqual({
      actualAvgCppAchieved: 1.17,
      totalPointsRedeemed90d: 3000,
      redemptionCount90d: 2,
    })
  })

  it('should handle missing pointsRedeemed and valueReceivedUsd', () => {
    const txns = [
      { pointsRedeemed: undefined, valueReceivedUsd: 10 },
      { pointsRedeemed: 1000, valueReceivedUsd: undefined },
      { pointsRedeemed: 500, valueReceivedUsd: 5 },
    ] as any
    const result = computeRedemptionStats(txns)
    expect(result).toEqual({
      actualAvgCppAchieved: 1.0,
      totalPointsRedeemed90d: 1500,
      redemptionCount90d: 3,
    })
  })
})

describe('computeMonthlyTrend', () => {
  it('should return empty monthlyTrend for empty monthBuckets', () => {
    const result = computeMonthlyTrend({})
    expect(result).toEqual({
      monthlyTrend: [],
      momSpendChangePct: null,
      fastestGrowingCategory: null,
    })
  })

  it('should calculate monthlyTrend for single month', () => {
    const monthBuckets = {
      '2024-01': { grocery: 500, dining: 300 },
    }
    const result = computeMonthlyTrend(monthBuckets)
    expect(result.monthlyTrend).toHaveLength(1)
    expect(result.monthlyTrend[0]).toEqual({
      month: '2024-01',
      totalSpentUsd: 800,
      categoryBreakdown: expect.arrayContaining([
        expect.objectContaining({ category: 'grocery', totalSpentUsd: 500 }),
        expect.objectContaining({ category: 'dining', totalSpentUsd: 300 }),
      ]),
    })
    expect(result.momSpendChangePct).toBeNull()
    expect(result.fastestGrowingCategory).toBeNull()
  })

  it('should calculate MoM change for multiple months', () => {
    const monthBuckets = {
      '2024-01': { grocery: 500, dining: 300 },
      '2024-02': { grocery: 600, dining: 400 },
    }
    const result = computeMonthlyTrend(monthBuckets)
    expect(result.monthlyTrend).toHaveLength(2)
    expect(result.momSpendChangePct).toBe(25.0) // (1000 - 800) / 800 * 100
  })

  it('should detect fastest growing category', () => {
    const monthBuckets = {
      '2024-01': { grocery: 500, dining: 300, travel: 100 },
      '2024-02': { grocery: 550, dining: 350, travel: 300 },
    }
    const result = computeMonthlyTrend(monthBuckets)
    expect(result.fastestGrowingCategory).toBe('travel')
  })

  it('should handle zero previous month spend', () => {
    const monthBuckets = {
      '2024-01': {},
      '2024-02': { grocery: 500 },
    }
    const result = computeMonthlyTrend(monthBuckets)
    expect(result.momSpendChangePct).toBeNull()
  })

  it('should sort months chronologically', () => {
    const monthBuckets = {
      '2024-03': { grocery: 100 },
      '2024-01': { grocery: 100 },
      '2024-02': { grocery: 100 },
    }
    const result = computeMonthlyTrend(monthBuckets)
    expect(result.monthlyTrend[0].month).toBe('2024-01')
    expect(result.monthlyTrend[1].month).toBe('2024-02')
    expect(result.monthlyTrend[2].month).toBe('2024-03')
  })
})

describe('buildCardCategoryBreakdown', () => {
  it('should return empty object for empty cardCategoryMap', () => {
    const result = buildCardCategoryBreakdown({})
    expect(result).toEqual({})
  })

  it('should build breakdown for single card with multiple categories', () => {
    const cardCategoryMap = {
      'card1': {
        grocery: { total: 500, count: 10 },
        dining: { total: 300, count: 5 },
      },
    }
    const result = buildCardCategoryBreakdown(cardCategoryMap)
    expect(result.card1).toHaveLength(2)
    expect(result.card1[0]).toEqual({
      category: 'grocery',
      totalSpentUsd: 500,
      txCount: 10,
      sharePct: 62.5,
    })
    expect(result.card1[1]).toEqual({
      category: 'dining',
      totalSpentUsd: 300,
      txCount: 5,
      sharePct: 37.5,
    })
  })

  it('should build breakdown for multiple cards', () => {
    const cardCategoryMap = {
      'card1': {
        grocery: { total: 500, count: 10 },
      },
      'card2': {
        dining: { total: 300, count: 5 },
      },
    }
    const result = buildCardCategoryBreakdown(cardCategoryMap)
    expect(Object.keys(result)).toHaveLength(2)
    expect(result.card1).toHaveLength(1)
    expect(result.card2).toHaveLength(1)
  })

  it('should calculate share percentage correctly', () => {
    const cardCategoryMap = {
      'card1': {
        grocery: { total: 100, count: 1 },
        dining: { total: 100, count: 1 },
        travel: { total: 100, count: 1 },
      },
    }
    const result = buildCardCategoryBreakdown(cardCategoryMap)
    expect(result.card1[0].sharePct).toBe(33.3)
    expect(result.card1[1].sharePct).toBe(33.3)
    expect(result.card1[2].sharePct).toBe(33.3)
  })

  it('should handle zero card total', () => {
    const cardCategoryMap = {
      'card1': {
        grocery: { total: 0, count: 0 },
      },
    }
    const result = buildCardCategoryBreakdown(cardCategoryMap)
    expect(result.card1[0].sharePct).toBe(0)
  })

  it('should sort categories by totalSpentUsd descending', () => {
    const cardCategoryMap = {
      'card1': {
        grocery: { total: 100, count: 1 },
        dining: { total: 500, count: 5 },
        travel: { total: 300, count: 3 },
      },
    }
    const result = buildCardCategoryBreakdown(cardCategoryMap)
    expect(result.card1[0].category).toBe('dining')
    expect(result.card1[1].category).toBe('travel')
    expect(result.card1[2].category).toBe('grocery')
  })
})
