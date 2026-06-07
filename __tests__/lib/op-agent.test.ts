// __tests__/lib/op-agent.test.ts
//
// Unit tests for pure helper functions in lib/op-agent.ts
// These functions require zero mocking as they are pure data transformations

import { describe, it, expect } from '@jest/globals'
import {
  checkCategoryExclusion,
  applyRotatingBonus,
  applyPortalBonus,
  applyEmiOverride,
  checkMonthlyCap,
  calculateCppTiers,
  calculateNetCost,
} from '@/lib/op-agent'

describe('checkCategoryExclusion', () => {
  it('should allow category not in excluded list', () => {
    const result = checkCategoryExclusion('grocery', ['dining', 'travel'])
    expect(result).toEqual({
      confirmedEarn: true,
      exclusionReason: null,
      earnRate: 0,
    })
  })

  it('should exclude category in excluded list', () => {
    const result = checkCategoryExclusion('grocery', ['grocery', 'travel'])
    expect(result).toEqual({
      confirmedEarn: false,
      exclusionReason: 'Category "grocery" is excluded for this card',
      earnRate: 0,
    })
  })

  it('should be case-insensitive when checking substring containment', () => {
    const result = checkCategoryExclusion('grocery store', ['GROCERY'])
    expect(result.confirmedEarn).toBe(false)
    expect(result.exclusionReason).toBe('Category "grocery store" is excluded for this card')
  })
})

describe('applyRotatingBonus', () => {
  it('should not apply bonus when rotating category is not active', () => {
    const result = applyRotatingBonus(
      'grocery',
      { isActive: false, activeCategories: ['grocery'], multiplier: 5 },
      1,
      100
    )
    expect(result).toEqual({
      earnRate: 1,
      bonusPoints: 0,
      rotatingBonusApplied: false,
    })
  })

  it('should not apply bonus when category not in active list', () => {
    const result = applyRotatingBonus(
      'dining',
      { isActive: true, activeCategories: ['grocery'], multiplier: 5 },
      1,
      100
    )
    expect(result).toEqual({
      earnRate: 1,
      bonusPoints: 0,
      rotatingBonusApplied: false,
    })
  })

  it('should apply bonus when category matches', () => {
    const result = applyRotatingBonus(
      'grocery',
      { isActive: true, activeCategories: ['grocery'], multiplier: 5 },
      1,
      100
    )
    expect(result).toEqual({
      earnRate: 5,
      bonusPoints: 4,
      rotatingBonusApplied: true,
    })
  })

  it('should handle null rotating category', () => {
    const result = applyRotatingBonus(
      'grocery',
      null,
      1,
      100
    )
    expect(result).toEqual({
      earnRate: 1,
      bonusPoints: 0,
      rotatingBonusApplied: false,
    })
  })
})

describe('applyPortalBonus', () => {
  it('should return base rate when no portal bonuses', () => {
    const result = applyPortalBonus('grocery', [], 1, 100)
    expect(result).toEqual({
      earnRate: 1,
      bonusPoints: 0,
      portalBonusApplied: false,
      portalBonusName: null,
      portalBonusUrl: null,
    })
  })

  it('should return base rate when category not in portal bonuses', () => {
    const result = applyPortalBonus(
      'grocery',
      [{ portalName: 'Rakuten', portalUrl: 'https://rakuten.com', categories: ['dining'], bonusMultiplier: 3, bonusType: 'cashback' }],
      1,
      100
    )
    expect(result).toEqual({
      earnRate: 1,
      bonusPoints: 0,
      portalBonusApplied: false,
      portalBonusName: null,
      portalBonusUrl: null,
    })
  })

  it('should apply portal bonus when category matches', () => {
    const result = applyPortalBonus(
      'grocery',
      [{ portalName: 'Rakuten', portalUrl: 'https://rakuten.com', categories: ['grocery'], bonusMultiplier: 3, bonusType: 'cashback' }],
      1,
      100
    )
    expect(result).toEqual({
      earnRate: 3,
      bonusPoints: 2,
      portalBonusApplied: true,
      portalBonusName: 'Rakuten',
      portalBonusUrl: 'https://rakuten.com',
    })
  })

  it('should use first matching portal bonus', () => {
    const result = applyPortalBonus(
      'grocery',
      [
        { portalName: 'Rakuten', portalUrl: 'https://rakuten.com', categories: ['grocery'], bonusMultiplier: 3, bonusType: 'cashback' },
        { portalName: 'TopCashback', portalUrl: 'https://topcashback.com', categories: ['grocery'], bonusMultiplier: 4, bonusType: 'cashback' },
      ],
      1,
      100
    )
    expect(result.portalBonusName).toBe('Rakuten')
  })
})

describe('applyEmiOverride', () => {
  it('should not override when not EMI transaction', () => {
    const result = applyEmiOverride(false, 0.5, 2)
    expect(result).toBe(2)
  })

  it('should override when EMI transaction with positive emiEarnRate', () => {
    const result = applyEmiOverride(true, 0.5, 2)
    expect(result).toBe(0.5)
  })

  it('should not override when EMI transaction with zero emiEarnRate', () => {
    const result = applyEmiOverride(true, 0, 2)
    expect(result).toBe(2)
  })
})

describe('checkMonthlyCap', () => {
  it('should not apply cap when monthlyCapPoints is null', () => {
    const result = checkMonthlyCap(100, 5, null)
    expect(result).toEqual({
      earnRate: 5,
      capBreached: false,
    })
  })

  it('should not apply cap when cap not breached', () => {
    const result = checkMonthlyCap(100, 1, 10)
    expect(result).toEqual({
      earnRate: 1,
      capBreached: false,
    })
  })

  it('should apply cap when cap is breached', () => {
    const result = checkMonthlyCap(100, 5, 2)
    expect(result).toEqual({
      earnRate: 2,
      capBreached: true,
    })
  })
})

describe('calculateCppTiers', () => {
  it('should use actualAvgCppAchieved when provided', () => {
    const result = calculateCppTiers(
      [{ name: 'Travel', ratePerPoint: 1.5 }],
      1.2,
      1.0
    )
    expect(result).toEqual({
      conservativeCpp: 1.5,
      realisticCpp: 1.2,
      industryAssumedCpp: 1.0,
    })
  })

  it('should fallback to bestRedemptionRatePerPoint when actualAvgCppAchieved is null', () => {
    const result = calculateCppTiers(
      [{ name: 'Travel', ratePerPoint: 1.5 }],
      null,
      1.0
    )
    expect(result).toEqual({
      conservativeCpp: 1.5,
      realisticCpp: 1.0,
      industryAssumedCpp: 1.0,
    })
  })

  it('should fallback to 1.0 when redemption paths is empty', () => {
    const result = calculateCppTiers(
      [],
      1.2,
      1.0
    )
    expect(result).toEqual({
      conservativeCpp: 1.0,
      realisticCpp: 1.2,
      industryAssumedCpp: 1.0,
    })
  })
})

describe('calculateNetCost', () => {
  it('should calculate basic cost', () => {
    const result = calculateNetCost(100, 5, 3, 1, 0.5, 0, 0)
    expect(result.netCost).toBe(95.5)
    expect(result.industryCost).toBe(97.5)
    expect(result.savings).toBe(2)
    expect(result.effectiveDiscountPercent).toBe(4.5)
  })

  it('should apply statement credit', () => {
    const result = calculateNetCost(100, 5, 3, 1, 0.5, 0, 2)
    expect(result.netCost).toBe(93.5)
  })

  it('should apply foreign transaction fee', () => {
    const result = calculateNetCost(100, 5, 3, 1, 0.5, 3, 0)
    expect(result.netCost).toBe(98.5)
  })

  it('should calculate savings correctly', () => {
    const result = calculateNetCost(100, 10, 5, 1, 0.5, 0, 0)
    expect(result.savings).toBe(5)
  })

  it('should calculate effective discount percentage', () => {
    const result = calculateNetCost(100, 20, 10, 1, 0.5, 0, 0)
    expect(result.effectiveDiscountPercent).toBe(19.5)
  })
})
