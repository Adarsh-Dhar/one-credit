// lib/op-agent/types.ts
//
// Type definitions for the Optimization Agent

import type { UserContext } from '@/lib/userContext/types'

export interface CalculationContext {
  product: OPAgentInput['product']
  userMonthlyTxns: number
  riskFreeRatePercent: number
  billingCycleDays: number
  userContext: UserContext
}

export interface CardKnowledge {
  name: string
  issuer: string
  annualFeeUsd: number
  gstOnFee: number
  baseEarnRate: number
  earnRules: Array<{
    merchant: string
    rate: number
    per: number
    currency: string
    notes?: string
  }>
  emiEarnRate: number
  monthlyCapPoints: number | null
  excludedCategories: string[]
  redemptionPaths: Array<{
    name: string
    ratePerPoint: number
    ratePerPointMin?: number
  }>
  bestRedemptionRatePerPoint: number
  bestRedemptionName: string
  statementCredits: Array<{
    name: string
    annualValueUsd: number
    merchantCategories: string[]
  }>
  portalBonuses: Array<{
    portalName: string
    portalUrl: string
    categories: string[]
    bonusMultiplier: number
    bonusType: string
  }>
  rotatingCategory: {
    isActive: boolean
    activeCategories: string[]
    multiplier: number
  } | null
  milestoneBonuses: Array<{
    spendThresholdUsd: number
    bonusPoints: number
    period: string
  }>
  feeWaiverSpendUsd: number | null
  foreignTxnFeePct: number
  rewardType: 'points' | 'miles' | 'cashback'
}

export interface EarnAudit {
  rate: number
  confirmedEarn: boolean
  exclusionReason: string | null
  capBreached: boolean
}

export interface EarnOutcome {
  actualPointsEarned: number
  basePointsEarned: number
  bonusPointsEarned: number
  earnAudit: EarnAudit
  rotatingBonusApplied: boolean
  portalBonusApplied: boolean
  portalBonusName: string | null
  portalBonusUrl: string | null
}

export interface CostBreakdown {
  netCost: number
  industryCost: number
  savings: number
  effectiveDiscountPercent: number
  feeBurdenUsd: number
  floatValueUsd: number
  foreignFeeUsd: number
  statementCreditApplied: number
  feeWaiverActive: boolean
  feeWaiverNote: string | null
}

export interface Valuation {
  trueRewardValueUsd: number
  industryRewardValue: number
  realisticCpp: number
  conservativeCpp: number
  industryAssumedCpp: number
  bestRedemptionName: string
  bestRedemptionRatePerPoint: number
}

export interface CardResult {
  cardKey: string
  name: string
  issuer: string
  rewardType: 'points' | 'miles' | 'cashback'
  reasoning?: string
  earn: EarnOutcome
  cost: CostBreakdown
  valuation: Valuation
}

export interface AnalysisResult {
  product: { name: string; price: number; url?: string }
  cards: CardResult[]
  winner: CardResult
  industryWinner: CardResult
  agentReasoning: string
  savingsVsIndustryUsd: number
  savingsVsBestAlternativeUsd: number
  userBehaviour: {
    actualAvgCppAchieved: number | null
    redemptionCount90d: number
  }
}

export interface OPAgentInput {
  product: {
    name: string
    price: number
    url?: string
    category: string
    merchant: string
    isEmi: boolean
    isForeignMerchant: boolean
  }
  cards: string[]
  cardKnowledgeMap: Record<string, CardKnowledge>
  userMonthlyTxns: number
  riskFreeRatePercent: number
  billingCycleDays: number
  userContext: UserContext
  userIntentSentences?: string[]
}
