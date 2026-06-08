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
  calculateCardResult,
  type CardKnowledge,
  type CalculationContext,
} from '@/lib/op-agent'

describe('checkCategoryExclusion', () => {
  it('should allow category not in excluded list', () => {
    const result = checkCategoryExclusion('grocery', ['dining', 'travel'])
    expect(result.confirmedEarn).toBe(true)
    expect(result.exclusionReason).toBeNull()
    expect(result.earnRate).toBe(0)
  })

  it('should exclude category in excluded list', () => {
    const result = checkCategoryExclusion('grocery', ['grocery', 'travel'])
    expect(result.confirmedEarn).toBe(false)
    expect(result.exclusionReason).toBe('Category "grocery" is excluded for this card')
    expect(result.earnRate).toBe(0)
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
    expect(result.earnRate).toBe(1)
    expect(result.bonusPoints).toBe(0)
    expect(result.rotatingBonusApplied).toBe(false)
  })

  it('should not apply bonus when category not in active list', () => {
    const result = applyRotatingBonus(
      'dining',
      { isActive: true, activeCategories: ['grocery'], multiplier: 5 },
      1,
      100
    )
    expect(result.earnRate).toBe(1)
    expect(result.bonusPoints).toBe(0)
    expect(result.rotatingBonusApplied).toBe(false)
  })

  it('should apply bonus when category matches', () => {
    const result = applyRotatingBonus(
      'grocery',
      { isActive: true, activeCategories: ['grocery'], multiplier: 5 },
      1,
      100
    )
    expect(result.earnRate).toBe(5)
    expect(result.bonusPoints).toBe(4)
    expect(result.rotatingBonusApplied).toBe(true)
  })

  it('should handle null rotating category', () => {
    const result = applyRotatingBonus(
      'grocery',
      null,
      1,
      100
    )
    expect(result.earnRate).toBe(1)
    expect(result.bonusPoints).toBe(0)
    expect(result.rotatingBonusApplied).toBe(false)
  })
})

describe('applyPortalBonus', () => {
  it('should return base rate when no portal bonuses', () => {
    const result = applyPortalBonus('grocery', [], 1, 100)
    expect(result.earnRate).toBe(1)
    expect(result.bonusPoints).toBe(0)
    expect(result.portalBonusApplied).toBe(false)
    expect(result.portalBonusName).toBeNull()
    expect(result.portalBonusUrl).toBeNull()
  })

  it('should return base rate when category not in portal bonuses', () => {
    const result = applyPortalBonus(
      'grocery',
      [{ portalName: 'Rakuten', portalUrl: 'https://rakuten.com', categories: ['dining'], bonusMultiplier: 3, bonusType: 'cashback' }],
      1,
      100
    )
    expect(result.earnRate).toBe(1)
    expect(result.bonusPoints).toBe(0)
    expect(result.portalBonusApplied).toBe(false)
    expect(result.portalBonusName).toBeNull()
    expect(result.portalBonusUrl).toBeNull()
  })

  it('should apply portal bonus when category matches', () => {
    const result = applyPortalBonus(
      'grocery',
      [{ portalName: 'Rakuten', portalUrl: 'https://rakuten.com', categories: ['grocery'], bonusMultiplier: 3, bonusType: 'cashback' }],
      1,
      100
    )
    expect(result.earnRate).toBe(3)
    expect(result.bonusPoints).toBe(2)
    expect(result.portalBonusApplied).toBe(true)
    expect(result.portalBonusName).toBe('Rakuten')
    expect(result.portalBonusUrl).toBe('https://rakuten.com')
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
    expect(result.earnRate).toBe(5)
    expect(result.capBreached).toBe(false)
  })

  it('should not apply cap when cap not breached', () => {
    const result = checkMonthlyCap(100, 1, 10)
    expect(result.earnRate).toBe(1)
    expect(result.capBreached).toBe(false)
  })

  it('should apply cap when cap is breached', () => {
    const result = checkMonthlyCap(100, 5, 2)
    expect(result.earnRate).toBe(2)
    expect(result.capBreached).toBe(true)
  })
})

describe('calculateCppTiers', () => {
  it('should use actualAvgCppAchieved when provided', () => {
    const result = calculateCppTiers(
      [{ name: 'Travel', ratePerPoint: 1.5 }],
      1.2,
      1.0
    )
    expect(result.conservativeCpp).toBe(1.5)
    expect(result.realisticCpp).toBe(1.2)
    expect(result.industryAssumedCpp).toBe(1.0)
  })

  it('should fallback to bestRedemptionRatePerPoint when actualAvgCppAchieved is null', () => {
    const result = calculateCppTiers(
      [{ name: 'Travel', ratePerPoint: 1.5 }],
      null,
      1.0
    )
    expect(result.conservativeCpp).toBe(1.5)
    expect(result.realisticCpp).toBe(1.0)
    expect(result.industryAssumedCpp).toBe(1.0)
  })

  it('should fallback to 1.0 when redemption paths is empty', () => {
    const result = calculateCppTiers(
      [],
      1.2,
      1.0
    )
    expect(result.conservativeCpp).toBe(1.0)
    expect(result.realisticCpp).toBe(1.2)
    expect(result.industryAssumedCpp).toBe(1.0)
  })
})

describe('calculateFeeBurden', () => {
  it('should calculate basic fee burden', () => {
    const result = calculateFeeBurden(95, 10)
    expect(result).toBe(95 / 12 / 10)
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
  })

  it('should calculate industry cost', () => {
    const result = calculateNetCost(100, 5, 3, 1, 0.5, 0, 0)
    expect(result.industryCost).toBe(97.5)
  })

  it('should calculate savings', () => {
    const result = calculateNetCost(100, 5, 3, 1, 0.5, 0, 0)
    expect(result.savings).toBe(2)
  })

  it('should calculate effective discount percentage', () => {
    const result = calculateNetCost(100, 5, 3, 1, 0.5, 0, 0)
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

describe('calculateCardResult', () => {
  it('should calculate card result for happy path', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: [],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [],
      rotatingCategory: null,
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)

    expect(result.cardKey).toBe('test-card')
  })

  it('should return correct card name', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: [],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [],
      rotatingCategory: null,
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)
    expect(result.name).toBe('Test Card')
  })

  it('should have positive net cost', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: [],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [],
      rotatingCategory: null,
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)
    expect(result.cost.netCost).toBeGreaterThan(0)
  })

  it('should not have fee waiver active', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: [],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [],
      rotatingCategory: null,
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)
    expect(result.cost.feeWaiverActive).toBe(false)
  })

  it('should confirm earn for happy path', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: [],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [],
      rotatingCategory: null,
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)
    expect(result.earn.earnAudit.confirmedEarn).toBe(true)
  })

  it('should have no exclusion reason for happy path', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: [],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [],
      rotatingCategory: null,
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)
    expect(result.earn.earnAudit.exclusionReason).toBeNull()
  })

  it('should not breach cap for happy path', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: [],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [],
      rotatingCategory: null,
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)
    expect(result.earn.earnAudit.capBreached).toBe(false)
  })

  it('should not confirm earn for excluded category', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: ['grocery'],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [],
      rotatingCategory: null,
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)
    expect(result.earn.earnAudit.confirmedEarn).toBe(false)
  })

  it('should have exclusion reason for excluded category', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: ['grocery'],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [],
      rotatingCategory: null,
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)
    expect(result.earn.earnAudit.exclusionReason).toBe('Category "grocery" is excluded for this card')
  })

  it('should have zero rate for excluded category', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: ['grocery'],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [],
      rotatingCategory: null,
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)
    expect(result.earn.earnAudit.rate).toBe(0)
  })

  it('should apply portal bonus when both bonuses apply', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: [],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [
        { portalName: 'Rakuten', portalUrl: 'https://rakuten.com', categories: ['grocery'], bonusMultiplier: 4, bonusType: 'cashback' },
      ],
      rotatingCategory: { isActive: true, activeCategories: ['grocery'], multiplier: 3 },
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)

    // Portal bonus (4x) should win over rotating bonus (3x)
    expect(result.earn.earnAudit.rate).toBe(4)
  })

  it('should apply rotating bonus when both bonuses apply', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: [],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [
        { portalName: 'Rakuten', portalUrl: 'https://rakuten.com', categories: ['grocery'], bonusMultiplier: 4, bonusType: 'cashback' },
      ],
      rotatingCategory: { isActive: true, activeCategories: ['grocery'], multiplier: 3 },
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)
    expect(result.earn.rotatingBonusApplied).toBe(true)
  })

  it('should apply portal bonus when both bonuses apply', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: [],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [
        { portalName: 'Rakuten', portalUrl: 'https://rakuten.com', categories: ['grocery'], bonusMultiplier: 4, bonusType: 'cashback' },
      ],
      rotatingCategory: { isActive: true, activeCategories: ['grocery'], multiplier: 3 },
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)
    expect(result.earn.portalBonusApplied).toBe(true)
  })

  it('should have correct portal bonus name when both bonuses apply', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: [],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [
        { portalName: 'Rakuten', portalUrl: 'https://rakuten.com', categories: ['grocery'], bonusMultiplier: 4, bonusType: 'cashback' },
      ],
      rotatingCategory: { isActive: true, activeCategories: ['grocery'], multiplier: 3 },
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)
    expect(result.earn.portalBonusName).toBe('Rakuten')
  })

  it('should apply rotating bonus when portal does not apply', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: [],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [
        { portalName: 'Rakuten', portalUrl: 'https://rakuten.com', categories: ['dining'], bonusMultiplier: 4, bonusType: 'cashback' },
      ],
      rotatingCategory: { isActive: true, activeCategories: ['grocery'], multiplier: 3 },
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)

    // Rotating bonus (3x) should apply since portal doesn't match grocery
    expect(result.earn.earnAudit.rate).toBe(3)
  })

  it('should apply rotating bonus when portal does not apply', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: [],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [
        { portalName: 'Rakuten', portalUrl: 'https://rakuten.com', categories: ['dining'], bonusMultiplier: 4, bonusType: 'cashback' },
      ],
      rotatingCategory: { isActive: true, activeCategories: ['grocery'], multiplier: 3 },
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)
    expect(result.earn.rotatingBonusApplied).toBe(true)
  })

  it('should not apply portal bonus when portal does not apply', () => {
    const card: CardKnowledge = {
      name: 'Test Card',
      issuer: 'Test Bank',
      annualFeeUsd: 95,
      gstOnFee: 18,
      baseEarnRate: 1,
      earnRules: [{ merchant: 'all', rate: 1, per: 100, currency: 'usd', notes: 'Base earn rate' }],
      emiEarnRate: 0,
      monthlyCapPoints: null,
      excludedCategories: [],
      redemptionPaths: [{ name: 'Statement credit', ratePerPoint: 1.0 }],
      bestRedemptionRatePerPoint: 1.0,
      bestRedemptionName: 'Statement credit',
      statementCredits: [],
      portalBonuses: [
        { portalName: 'Rakuten', portalUrl: 'https://rakuten.com', categories: ['dining'], bonusMultiplier: 4, bonusType: 'cashback' },
      ],
      rotatingCategory: { isActive: true, activeCategories: ['grocery'], multiplier: 3 },
      milestoneBonuses: [],
      feeWaiverSpendUsd: null,
      foreignTxnFeePct: 0,
      rewardType: 'cashback',
    }

    const ctx: CalculationContext = {
      product: { name: 'Test Product', price: 100, category: 'grocery', merchant: 'Amazon', isEmi: false, isForeignMerchant: false },
      userMonthlyTxns: 10,
      riskFreeRatePercent: 5,
      billingCycleDays: 30,
      userContext: {
        userId: 'test-user',
        cards: [],
        behaviour: {
          categoryBreakdown: [],
          cardCategoryBreakdown: {},
          topMerchants: [],
          cardTopMerchants: {},
          topCategory: 'grocery',
          isFrequentTraveller: false,
          isFrequentDiner: false,
          isOnlineShopper: false,
          isGroceryDominant: false,
          monthlyAvgSpendUsd: 1000,
          monthlyTrend: [],
          momSpendChangePct: null,
          fastestGrowingCategory: null,
          actualAvgCppAchieved: 1.0,
          totalPointsRedeemed90d: 0,
          redemptionCount90d: 0,
          emiTransactionPct: 0,
        },
        totalOpTokens: 0,
        totalOpBalanceUsd: 0,
      },
    }

    const result = calculateCardResult('test-card', card, ctx)
    expect(result.earn.portalBonusApplied).toBe(false)
  })
})
