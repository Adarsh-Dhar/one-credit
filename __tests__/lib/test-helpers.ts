import type { CardKnowledge, CalculationContext } from '@/lib/op-agent';

export function createTestCard(overrides: Partial<CardKnowledge> = {}): CardKnowledge {
  return {
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
    ...overrides,
  };
}

export function createTestContext(overrides: Partial<CalculationContext> = {}): CalculationContext {
  return {
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
        monthlyInstallmentTransactionPct: 0,
      },
      totalOpTokens: 0,
      totalOpBalanceUsd: 0,
    },
    ...overrides,
  };
}
