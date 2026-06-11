// lib/op-agent/calculations.ts
//
// Deterministic math calculations for the Optimization Agent
// No AI involved - pure mathematical computations

import type { CardKnowledge, EarnAudit, EarnOutcome, CostBreakdown, Valuation, CalculationContext } from './types'
import { OP_AGENT_CONFIG } from '@/lib/constants'

const FLOAT_PERIOD_DAYS = OP_AGENT_CONFIG.FLOAT_PERIOD_DAYS
const DAYS_PER_YEAR = OP_AGENT_CONFIG.DAYS_PER_YEAR

export function checkCategoryExclusion(
  category: string,
  excludedCategories: string[],
  baseRate?: number
): { confirmedEarn: boolean; exclusionReason: string | null; earnRate: number } {
  if (excludedCategories.some(exc => category.includes(exc.toLowerCase()))) {
    return {
      confirmedEarn: false,
      exclusionReason: `Category "${category}" is excluded for this card`,
      earnRate: 0,
    }
  }
  return { confirmedEarn: true, exclusionReason: null, earnRate: baseRate ?? 0 }
}

export function applyRotatingBonus(
  category: string,
  rotatingCategory: CardKnowledge['rotatingCategory'],
  baseRate: number,
  price: number
): { earnRate: number; bonusPoints: number; rotatingBonusApplied: boolean } {
  if (rotatingCategory?.isActive && rotatingCategory.activeCategories.some(cat => category.includes(cat.toLowerCase()))) {
    const earnRate = rotatingCategory.multiplier
    const bonusPoints = (price * (earnRate - baseRate)) / 100
    return { earnRate, bonusPoints, rotatingBonusApplied: true }
  }
  return { earnRate: baseRate, bonusPoints: 0, rotatingBonusApplied: false }
}

export function applyPortalBonus(
  category: string,
  portalBonuses: CardKnowledge['portalBonuses'],
  baseRate: number,
  price: number
): { earnRate: number; bonusPoints: number; portalBonusApplied: boolean; portalBonusName: string | null; portalBonusUrl: string | null } {
  for (const bonus of portalBonuses) {
    if (bonus.categories.some(cat => category.includes(cat.toLowerCase()))) {
      const earnRate = bonus.bonusMultiplier
      const bonusPoints = (price * (earnRate - baseRate)) / 100
      return {
        earnRate,
        bonusPoints,
        portalBonusApplied: true,
        portalBonusName: bonus.portalName,
        portalBonusUrl: bonus.portalUrl,
      }
    }
  }
  return { earnRate: baseRate, bonusPoints: 0, portalBonusApplied: false, portalBonusName: null, portalBonusUrl: null }
}

export function applyEmiEarnRate(
  emiEarnRate: number,
  currentEarnRate: number
): number {
  return emiEarnRate > 0 ? emiEarnRate : currentEarnRate
}

export function checkMonthlyCap(
  price: number,
  earnRate: number,
  monthlyCapPoints: number | null
): { earnRate: number; capBreached: boolean } {
  if (monthlyCapPoints && (price * earnRate / 100) > monthlyCapPoints) {
    return {
      capBreached: true,
      earnRate: (monthlyCapPoints * 100) / price,
    }
  }
  return { earnRate, capBreached: false }
}

export function calculateCppTiers(
  redemptionPaths: CardKnowledge['redemptionPaths'],
  actualAvgCppAchieved: number | null,
  bestRedemptionRatePerPoint: number
): { conservativeCpp: number; realisticCpp: number; industryAssumedCpp: number } {
  const conservativeCpp = redemptionPaths[0]?.ratePerPoint ?? 1.0
  const realisticCpp = actualAvgCppAchieved ?? bestRedemptionRatePerPoint
  const industryAssumedCpp = 1.0
  return { conservativeCpp, realisticCpp, industryAssumedCpp }
}

export function calculateFeeBurden(
  annualFeeUsd: number,
  userMonthlyTxns: number
): number {
  return annualFeeUsd / 12 / userMonthlyTxns
}

export function resolveStatementCredit(
  category: string,
  statementCredits: CardKnowledge['statementCredits']
): number {
  const match = statementCredits.find(sc =>
    sc.merchantCategories.some(cat => category.includes(cat.toLowerCase()))
  )
  return match ? match.annualValueUsd / 12 : 0
}

interface CostCalculationParams {
  price: number
  trueRewardValueUsd: number
  industryRewardValue: number
  feeBurdenUsd: number
  floatValueUsd: number
  foreignFeeUsd: number
  statementCreditApplied: number
}

export function calculateNetCost(
  params: CostCalculationParams
): { netCost: number; industryCost: number; savings: number; effectiveDiscountPercent: number } {
  const { price, trueRewardValueUsd, industryRewardValue, feeBurdenUsd, floatValueUsd, foreignFeeUsd, statementCreditApplied } = params
  const netCost = price - trueRewardValueUsd + feeBurdenUsd - floatValueUsd + foreignFeeUsd - statementCreditApplied
  const industryCost = price - industryRewardValue + feeBurdenUsd - floatValueUsd + foreignFeeUsd - statementCreditApplied
  const savings = industryCost - netCost
  const effectiveDiscountPercent = ((price - netCost) / price) * 100
  return { netCost, industryCost, savings, effectiveDiscountPercent }
}

export function calculatePointsEarned(
  price: number,
  baseRate: number,
  earnRate: number
): { basePoints: number; totalPoints: number; bonusPoints: number } {
  const basePoints = (price * baseRate) / 100
  const totalPoints = (price * earnRate) / 100
  const bonusPoints = totalPoints - basePoints
  return { basePoints, totalPoints, bonusPoints }
}

export function buildEarnAudit(
  earnRate: number,
  confirmedEarn: boolean,
  exclusionReason: string | null,
  capBreached: boolean
): EarnAudit {
  return {
    rate: earnRate,
    confirmedEarn,
    exclusionReason,
    capBreached,
  }
}

function selectBestBonusRate(
  rotatingResult: { earnRate: number; rotatingBonusApplied: boolean },
  portalResult: { earnRate: number; portalBonusApplied: boolean; portalBonusName: string | null; portalBonusUrl: string | null }
): {
  earnRate: number
  portalBonusApplied: boolean
  portalBonusName: string | null
  portalBonusUrl: string | null
} {
  if (!rotatingResult.rotatingBonusApplied && portalResult.portalBonusApplied) {
    return {
      earnRate: portalResult.earnRate,
      portalBonusApplied: true,
      portalBonusName: portalResult.portalBonusName,
      portalBonusUrl: portalResult.portalBonusUrl,
    }
  }

  if (rotatingResult.rotatingBonusApplied && portalResult.portalBonusApplied) {
    if (portalResult.earnRate > rotatingResult.earnRate) {
      return {
        earnRate: portalResult.earnRate,
        portalBonusApplied: true,
        portalBonusName: portalResult.portalBonusName,
        portalBonusUrl: portalResult.portalBonusUrl,
      }
    }
  }

  return {
    earnRate: rotatingResult.earnRate,
    portalBonusApplied: false,
    portalBonusName: null,
    portalBonusUrl: null,
  }
}

function resolveBonusRate(
  category: string,
  card: CardKnowledge,
  baseRate: number,
  price: number,
  confirmedEarn: boolean,
  excludedRate: number
): {
  earnRate: number
  rotatingBonusApplied: boolean
  portalBonusApplied: boolean
  portalBonusName: string | null
  portalBonusUrl: string | null
} {
  const rotatingResult = applyRotatingBonus(category, card.rotatingCategory, baseRate, price)
  const rotatingBonusApplied = confirmedEarn ? rotatingResult.rotatingBonusApplied : false
  const initialEarnRate = confirmedEarn ? rotatingResult.earnRate : excludedRate

  const portalResult = applyPortalBonus(category, card.portalBonuses, baseRate, price)

  if (!confirmedEarn) {
    return {
      earnRate: initialEarnRate,
      rotatingBonusApplied,
      portalBonusApplied: false,
      portalBonusName: null,
      portalBonusUrl: null,
    }
  }

  const bonusSelection = selectBestBonusRate(rotatingResult, portalResult)

  return {
    earnRate: bonusSelection.earnRate,
    rotatingBonusApplied,
    portalBonusApplied: bonusSelection.portalBonusApplied,
    portalBonusName: bonusSelection.portalBonusName,
    portalBonusUrl: bonusSelection.portalBonusUrl,
  }
}

function calculateFeeWaiverStatus(
  card: CardKnowledge,
  userContext: CalculationContext['userContext']
): { feeWaiverActive: boolean; feeWaiverNote: string | null } {
  if (!userContext.behaviour) {
    return { feeWaiverActive: false, feeWaiverNote: 'Behaviour data unavailable' }
  }

  const monthlySpend = userContext.behaviour.monthlyAvgSpendUsd
  const feeWaiverActive = card.feeWaiverSpendUsd !== null && monthlySpend >= card.feeWaiverSpendUsd
  const feeWaiverNote = feeWaiverActive ? 'Waived based on spend' : null

  return { feeWaiverActive, feeWaiverNote }
}

function calculateRewardValue(
  totalPoints: number,
  realisticCpp: number,
  price: number,
  earnRate: number
): { trueRewardValueUsd: number; industryRewardValue: number } {
  return {
    trueRewardValueUsd: (totalPoints * realisticCpp) / 100,
    industryRewardValue: (price * earnRate) / 100,
  }
}

function calculateCostComponents(
  product: CalculationContext['product'],
  card: CardKnowledge,
  riskFreeRatePercent: number,
  category: string
): {
  floatValueUsd: number
  statementCreditApplied: number
  foreignFeeUsd: number
} {
  const floatValueUsd = (product.price * riskFreeRatePercent / 100) * (FLOAT_PERIOD_DAYS / DAYS_PER_YEAR)
  const statementCreditApplied = resolveStatementCredit(category, card.statementCredits)
  const foreignFeeUsd = product.isForeignMerchant ? (product.price * card.foreignTxnFeePct / 100) : 0

  return { floatValueUsd, statementCreditApplied, foreignFeeUsd }
}

function calculateEffectiveEarnRate(
  category: string,
  card: CardKnowledge,
  price: number,
  isEmi: boolean
): {
  earnRate: number
  confirmedEarn: boolean
  exclusionReason: string | null
  rotatingBonusApplied: boolean
  portalBonusApplied: boolean
  portalBonusName: string | null
  portalBonusUrl: string | null
  capBreached: boolean
} {
  const baseRate = card.baseEarnRate

  const exclusionResult = checkCategoryExclusion(category, card.excludedCategories, baseRate)
  const confirmedEarn = exclusionResult.confirmedEarn
  const exclusionReason = exclusionResult.exclusionReason
  let earnRate = exclusionResult.earnRate

  const bonusResult = resolveBonusRate(category, card, baseRate, price, confirmedEarn, earnRate)
  earnRate = bonusResult.earnRate
  const rotatingBonusApplied = bonusResult.rotatingBonusApplied
  const portalBonusApplied = bonusResult.portalBonusApplied
  const portalBonusName = bonusResult.portalBonusName
  const portalBonusUrl = bonusResult.portalBonusUrl

  earnRate = isEmi ? applyEmiEarnRate(card.emiEarnRate, earnRate) : earnRate

  const capResult = checkMonthlyCap(price, earnRate, card.monthlyCapPoints)
  earnRate = capResult.earnRate
  const capBreached = capResult.capBreached

  return {
    earnRate,
    confirmedEarn,
    exclusionReason,
    rotatingBonusApplied,
    portalBonusApplied,
    portalBonusName,
    portalBonusUrl,
    capBreached,
  }
}

function calculateCardValuation(
  card: CardKnowledge,
  totalPoints: number,
  userContext: CalculationContext['userContext'],
  price: number,
  earnRate: number
): {
  conservativeCpp: number
  realisticCpp: number
  industryAssumedCpp: number
  trueRewardValueUsd: number
  industryRewardValue: number
} {
  const centsPerPointResult = calculateCppTiers(
    card.redemptionPaths,
    userContext.behaviour?.actualAvgCppAchieved,
    card.bestRedemptionRatePerPoint
  )
  const { conservativeCpp, realisticCpp, industryAssumedCpp } = centsPerPointResult

  const { trueRewardValueUsd, industryRewardValue } = calculateRewardValue(totalPoints, realisticCpp, price, earnRate)

  return { conservativeCpp, realisticCpp, industryAssumedCpp, trueRewardValueUsd, industryRewardValue }
}

function calculateCardCosts(
  product: CalculationContext['product'],
  card: CardKnowledge,
  userMonthlyTxns: number,
  riskFreeRatePercent: number,
  category: string,
  trueRewardValueUsd: number,
  industryRewardValue: number,
  userContext: CalculationContext['userContext']
): {
  feeBurdenUsd: number
  feeWaiverActive: boolean
  feeWaiverNote: string | null
  floatValueUsd: number
  statementCreditApplied: number
  foreignFeeUsd: number
  netCost: number
  industryCost: number
  savings: number
  effectiveDiscountPercent: number
} {
  const { feeWaiverActive, feeWaiverNote } = calculateFeeWaiverStatus(card, userContext)
  const feeBurdenUsd = feeWaiverActive ? 0 : calculateFeeBurden(card.annualFeeUsd, userMonthlyTxns)

  const { floatValueUsd, statementCreditApplied, foreignFeeUsd } = calculateCostComponents(
    product,
    card,
    riskFreeRatePercent,
    category
  )

  const costResult = calculateNetCost({
    price: product.price,
    trueRewardValueUsd,
    industryRewardValue,
    feeBurdenUsd,
    floatValueUsd,
    foreignFeeUsd,
    statementCreditApplied,
  })

  return {
    feeBurdenUsd,
    feeWaiverActive,
    feeWaiverNote,
    floatValueUsd,
    statementCreditApplied,
    foreignFeeUsd,
    netCost: costResult.netCost,
    industryCost: costResult.industryCost,
    savings: costResult.savings,
    effectiveDiscountPercent: costResult.effectiveDiscountPercent,
  }
}

export function calculateCardResult(
  cardKey: string,
  card: CardKnowledge,
  context: CalculationContext
): { cardKey: string; name: string; issuer: string; rewardType: CardKnowledge['rewardType']; earn: EarnOutcome; cost: CostBreakdown; valuation: Valuation } {
  const { product, userMonthlyTxns, riskFreeRatePercent, userContext } = context
  const price = product.price
  const isEmi = product.isEmi
  const category = product.category.toLowerCase()
  const baseRate = card.baseEarnRate

  const earnRateResult = calculateEffectiveEarnRate(category, card, price, isEmi)

  const { basePoints, totalPoints, bonusPoints } = calculatePointsEarned(price, baseRate, earnRateResult.earnRate)

  const valuation = calculateCardValuation(card, totalPoints, userContext, price, earnRateResult.earnRate)

  const costs = calculateCardCosts(
    product,
    card,
    userMonthlyTxns,
    riskFreeRatePercent,
    category,
    valuation.trueRewardValueUsd,
    valuation.industryRewardValue,
    userContext
  )

  const earnAudit = buildEarnAudit(earnRateResult.earnRate, earnRateResult.confirmedEarn, earnRateResult.exclusionReason, earnRateResult.capBreached)

  return {
    cardKey,
    name: card.name,
    issuer: card.issuer,
    rewardType: card.rewardType,
    earn: {
      actualPointsEarned: totalPoints,
      basePointsEarned: basePoints,
      bonusPointsEarned: bonusPoints,
      earnAudit,
      rotatingBonusApplied: earnRateResult.rotatingBonusApplied,
      portalBonusApplied: earnRateResult.portalBonusApplied,
      portalBonusName: earnRateResult.portalBonusName,
      portalBonusUrl: earnRateResult.portalBonusUrl,
    },
    cost: {
      netCost: costs.netCost,
      industryCost: costs.industryCost,
      savings: costs.savings,
      effectiveDiscountPercent: costs.effectiveDiscountPercent,
      feeBurdenUsd: costs.feeBurdenUsd,
      floatValueUsd: costs.floatValueUsd,
      foreignFeeUsd: costs.foreignFeeUsd,
      statementCreditApplied: costs.statementCreditApplied,
      feeWaiverActive: costs.feeWaiverActive,
      feeWaiverNote: costs.feeWaiverNote,
    },
    valuation: {
      trueRewardValueUsd: valuation.trueRewardValueUsd,
      industryRewardValue: valuation.industryRewardValue,
      realisticCpp: valuation.realisticCpp,
      conservativeCpp: valuation.conservativeCpp,
      industryAssumedCpp: valuation.industryAssumedCpp,
      bestRedemptionName: card.bestRedemptionName,
      bestRedemptionRatePerPoint: card.bestRedemptionRatePerPoint,
    },
  }
}
