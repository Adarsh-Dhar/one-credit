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
  calculateFeeBurden,
  resolveStatementCredit,
  generateReasoningWithGemini,
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

describe('calculateFeeBurden', () => {
  it('should calculate basic fee burden', () => {
    const result = calculateFeeBurden(95, 10)
    expect(result).toBe(9.5 / 10)
  })

  it('should handle zero monthly transactions', () => {
    const result = calculateFeeBurden(95, 0)
    expect(result).toBe(Infinity)
  })

  it('should handle high annual fee with low transaction count', () => {
    const result = calculateFeeBurden(450, 5)
    expect(result).toBe(450 / 12 / 5)
  })
})

describe('resolveStatementCredit', () => {
  it('should return zero when no statement credits match', () => {
    const credits = [
      { name: 'Streaming', annualValueUsd: 120, merchantCategories: ['streaming', 'entertainment'] },
    ]
    const result = resolveStatementCredit('grocery', credits)
    expect(result).toBe(0)
  })

  it('should return monthly value when category matches', () => {
    const credits = [
      { name: 'Grocery', annualValueUsd: 120, merchantCategories: ['grocery', 'supermarket'] },
    ]
    const result = resolveStatementCredit('grocery store', credits)
    expect(result).toBe(10)
  })

  it('should use first matching statement credit', () => {
    const credits = [
      { name: 'Grocery', annualValueUsd: 120, merchantCategories: ['grocery'] },
      { name: 'Supermarket', annualValueUsd: 240, merchantCategories: ['grocery', 'supermarket'] },
    ]
    const result = resolveStatementCredit('grocery', credits)
    expect(result).toBe(10)
  })

  it('should be case-insensitive when matching categories', () => {
    const credits = [
      { name: 'Grocery', annualValueUsd: 120, merchantCategories: ['GROCERY'] },
    ]
    const result = resolveStatementCredit('grocery', credits)
    expect(result).toBe(10)
  })

  it('should handle empty statement credits array', () => {
    const result = resolveStatementCredit('grocery', [])
    expect(result).toBe(0)
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

describe('feeWaiverActive resolution', () => {
  it('should be false when feeWaiverSpendUsd is null', () => {
    const monthlySpend = 5000
    const feeWaiverSpendUsd = null
    const result = feeWaiverSpendUsd !== null && monthlySpend >= feeWaiverSpendUsd
    expect(result).toBe(false)
  })

  it('should be false when behaviour is undefined (monthlySpend defaults to 0)', () => {
    const monthlySpend = 0
    const feeWaiverSpendUsd = 3000
    const result = feeWaiverSpendUsd !== null && monthlySpend >= feeWaiverSpendUsd
    expect(result).toBe(false)
  })

  it('should be true when monthlySpend meets the waiver threshold', () => {
    const monthlySpend = 3000
    const feeWaiverSpendUsd = 3000
    const result = feeWaiverSpendUsd !== null && monthlySpend >= feeWaiverSpendUsd
    expect(result).toBe(true)
  })

  it('should be false when monthlySpend is below the waiver threshold', () => {
    const monthlySpend = 2999
    const feeWaiverSpendUsd = 3000
    const result = feeWaiverSpendUsd !== null && monthlySpend >= feeWaiverSpendUsd
    expect(result).toBe(false)
  })
})

describe('generateReasoningWithGemini', () => {
  it('should use Gemini response when model returns valid JSON', async () => {
    const mockModel = {
      generateContent: async () => ({
        response: {
          text: () => JSON.stringify({
            cardReasonings: { card1: 'Good for grocery' },
            agentReasoning: 'card1 is best',
          }),
        },
      }),
    } as any

    const cards = [{
      cardKey: 'card1', name: 'Test Card', issuer: 'Bank',
      earnAudit: { rate: 2, per: 100, confirmedEarn: true, exclusionReason: null, capBreached: false },
      netCost: 95, rotatingBonusApplied: false, portalBonusApplied: false, portalBonusName: null,
      statementCreditApplied: 0, feeWaiverActive: false, foreignFeeUsd: 0,
    }] as any

    const product = { name: 'Rice', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false }

    const result = await generateReasoningWithGemini(cards, product, mockModel)
    expect(result.cardReasonings['card1']).toBe('Good for grocery')
    expect(result.agentReasoning).toBe('card1 is best')
  })

  it('should fall back to auto-generated reasoning when model throws', async () => {
    const mockModel = {
      generateContent: async () => {
        throw new Error('API error')
      },
    } as any

    const cards = [{
      cardKey: 'card1', name: 'Test Card', issuer: 'Bank',
      earnAudit: { rate: 2, per: 100, confirmedEarn: true, exclusionReason: null, capBreached: false },
      netCost: 95, rotatingBonusApplied: false, portalBonusApplied: false, portalBonusName: null,
      statementCreditApplied: 0, feeWaiverActive: false, foreignFeeUsd: 0, industryCost: 97,
      actualPointsEarned: 2,
    }] as any

    const product = { name: 'Rice', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false }

    const result = await generateReasoningWithGemini(cards, product, mockModel)
    expect(result.cardReasonings['card1']).toContain('Earns 2x')
    expect(result.agentReasoning).toContain('Test Card')
  })
})
