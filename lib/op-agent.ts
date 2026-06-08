// lib/op-agent.ts
//
// Optimization Agent for product-specific purchase analysis.
// Calculates which card to use for a specific purchase based on deterministic math,
// then uses Gemini only for generating reasoning strings.
//
// This is a two-pass design:
// - Pass 1: Deterministic math (earn rates, CPP, fees, float value, etc.) - no AI
// - Pass 2: Gemini only for reasoning strings (falls back to auto-generated if AI fails)

import logger from '@/lib/logger'
import type { UserContext } from '@/lib/userContext'

// ─── Constants ───────────────────────────────────────────────────────────────

const INDUSTRY_STANDARD_CPP = 1.0
const FLOAT_PERIOD_DAYS = 30
const DAYS_PER_YEAR = 365

// ─── Types matching SidePanel.tsx ─────────────────────────────────────────────

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
  per: number
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

interface OPAgentInput {
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
}

// ─── Deterministic math pass (no AI) ─────────────────────────────────────────

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

export function applyEmiOverride(
  isEmi: boolean,
  emiEarnRate: number,
  currentEarnRate: number
): number {
  return isEmi && emiEarnRate > 0 ? emiEarnRate : currentEarnRate
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
  const industryAssumedCpp = INDUSTRY_STANDARD_CPP
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

export function calculateNetCost(
  price: number,
  trueRewardValueUsd: number,
  industryRewardValue: number,
  feeBurdenUsd: number,
  floatValueUsd: number,
  foreignFeeUsd: number,
  statementCreditApplied: number
): { netCost: number; industryCost: number; savings: number; effectiveDiscountPercent: number } {
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
    per: 100,
    confirmedEarn,
    exclusionReason,
    capBreached,
  }
}

export function calculateCardResult(
  cardKey: string,
  card: CardKnowledge,
  ctx: CalculationContext
): CardResult {
  const { product, userMonthlyTxns, riskFreeRatePercent, userContext } = ctx
  const price = product.price
  const isEmi = product.isEmi
  const category = product.category.toLowerCase()
  const baseRate = card.earnRules[0]?.rate ?? 1

  // Step 1: Check exclusions
  const exclusionResult = checkCategoryExclusion(category, card.excludedCategories, baseRate)
  const confirmedEarn = exclusionResult.confirmedEarn
  const exclusionReason = exclusionResult.exclusionReason
  let earnRate = exclusionResult.earnRate

  // Step 2: Apply rotating bonus (only if category is not excluded)
  const rotatingResult = applyRotatingBonus(category, card.rotatingCategory, baseRate, price)
  const rotatingBonusApplied = confirmedEarn ? rotatingResult.rotatingBonusApplied : false
  if (confirmedEarn) {
    earnRate = rotatingResult.earnRate
  }

  // Step 3: Apply portal bonus (only if rotating was not applied, or take the higher rate)
  const portalResult = applyPortalBonus(category, card.portalBonuses, baseRate, price)
  let portalBonusApplied = false
  let portalBonusName: string | null = null
  let portalBonusUrl: string | null = null
  if (confirmedEarn) {
    if (!rotatingBonusApplied && portalResult.portalBonusApplied) {
      // Portal bonus applies when rotating was not active
      earnRate = portalResult.earnRate
      portalBonusApplied = portalResult.portalBonusApplied
      portalBonusName = portalResult.portalBonusName
      portalBonusUrl = portalResult.portalBonusUrl
    } else if (rotatingBonusApplied && portalResult.portalBonusApplied) {
      // Both apply - take the higher rate
      if (portalResult.earnRate > rotatingResult.earnRate) {
        earnRate = portalResult.earnRate
        portalBonusApplied = portalResult.portalBonusApplied
        portalBonusName = portalResult.portalBonusName
        portalBonusUrl = portalResult.portalBonusUrl
      }
    }
  }

  // Step 4: Apply EMI override
  earnRate = applyEmiOverride(isEmi, card.emiEarnRate, earnRate)

  // Step 5: Check monthly cap
  const capResult = checkMonthlyCap(price, earnRate, card.monthlyCapPoints)
  earnRate = capResult.earnRate
  const capBreached = capResult.capBreached

  // Calculate points
  const { basePoints, totalPoints, bonusPoints } = calculatePointsEarned(price, baseRate, earnRate)

  // Step 6: Calculate CPP tiers
  const cppResult = calculateCppTiers(
    card.redemptionPaths,
    userContext.behaviour?.actualAvgCppAchieved,
    card.bestRedemptionRatePerPoint
  )
  const { conservativeCpp, realisticCpp, industryAssumedCpp } = cppResult

  // Calculate reward value
  const trueRewardValueUsd = (totalPoints * realisticCpp) / 100
  const industryRewardValue = (totalPoints * industryAssumedCpp) / 100

  // Fee burden (amortized over monthly transactions)
  const feeBurdenUsd = calculateFeeBurden(card.annualFeeUsd, userMonthlyTxns)
  let feeWaiverActive: boolean
  let feeWaiverNote: string | null
  if (!userContext.behaviour) {
    logger.warn('[calculateCardResult] behaviour is undefined, skipping fee waiver calculation')
    feeWaiverActive = false
    feeWaiverNote = 'Behaviour data unavailable'
  } else {
    const monthlySpend = userContext.behaviour.monthlyAvgSpendUsd
    feeWaiverActive = card.feeWaiverSpendUsd !== null && monthlySpend >= card.feeWaiverSpendUsd
    feeWaiverNote = feeWaiverActive ? 'Waived based on spend' : null
  }

  // Float value (30-day grace period at risk-free rate)
  const floatValueUsd = (price * riskFreeRatePercent / 100) * (FLOAT_PERIOD_DAYS / DAYS_PER_YEAR)

  // Statement credits
  const statementCreditApplied = resolveStatementCredit(category, card.statementCredits)

  // Foreign transaction fee
  const foreignFeeUsd = product.isForeignMerchant ? (price * card.foreignTxnFeePct / 100) : 0

  // Step 7: Calculate net cost
  const costResult = calculateNetCost(
    price,
    trueRewardValueUsd,
    industryRewardValue,
    feeBurdenUsd,
    floatValueUsd,
    foreignFeeUsd,
    statementCreditApplied
  )
  const { netCost, industryCost, savings, effectiveDiscountPercent } = costResult

  // Build earn audit
  const earnAudit = buildEarnAudit(earnRate, confirmedEarn, exclusionReason, capBreached)

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
      rotatingBonusApplied,
      portalBonusApplied,
      portalBonusName,
      portalBonusUrl,
    },
    cost: {
      netCost,
      industryCost,
      savings,
      effectiveDiscountPercent,
      feeBurdenUsd,
      floatValueUsd,
      foreignFeeUsd,
      statementCreditApplied,
      feeWaiverActive,
      feeWaiverNote,
    },
    valuation: {
      trueRewardValueUsd,
      industryRewardValue,
      realisticCpp,
      conservativeCpp,
      industryAssumedCpp,
      bestRedemptionName: card.bestRedemptionName,
      bestRedemptionRatePerPoint: card.bestRedemptionRatePerPoint,
    },
  }
}

// ─── Auto-generated reasoning (fallback if Gemini fails) ───────────────────

function generateAutoReasoning(card: CardResult, product: OPAgentInput['product']): string {
  const parts: string[] = []

  if (card.earn.earnAudit.exclusionReason) {
    parts.push(card.earn.earnAudit.exclusionReason)
  } else {
    parts.push(`Earns ${card.earn.earnAudit.rate}x on ${product.category}`)
  }

  if (card.earn.rotatingBonusApplied) {
    parts.push('Rotating category bonus active')
  }

  if (card.earn.portalBonusApplied) {
    parts.push(`Portal bonus via ${card.earn.portalBonusName}`)
  }

  if (card.cost.statementCreditApplied > 0) {
    parts.push(`Statement credit applied: $${card.cost.statementCreditApplied.toFixed(2)}`)
  }

  if (card.cost.feeWaiverActive) {
    parts.push('Annual fee waived based on spend')
  }

  if (card.cost.foreignFeeUsd > 0) {
    parts.push(`Foreign transaction fee: $${card.cost.foreignFeeUsd.toFixed(2)}`)
  }

  parts.push(`Effective cost: $${card.cost.netCost.toFixed(2)}`)

  return parts.join('. ') + '.'
}

function generateAgentReasoning(winner: CardResult, allCards: CardResult[], product: OPAgentInput['product']): string {
  const savingsVsIndustry = winner.cost.industryCost - winner.cost.netCost
  const savingsVsBest = allCards.length > 1 ? Math.max(...allCards.map(c => c.cost.netCost)) - winner.cost.netCost : 0

  return `${winner.name} is the best choice for this ${product.category} purchase at $${product.price.toFixed(2)}. It earns ${winner.earn.earnAudit.rate}x (${winner.earn.actualPointsEarned.toLocaleString()} points) with an effective cost of $${winner.cost.netCost.toFixed(2)}. You save $${savingsVsIndustry.toFixed(2)} compared to industry valuation${savingsVsBest > 0 ? ` and $${savingsVsBest.toFixed(2)} vs the next best card` : ''}.`
}

// ─── Gemini reasoning pass (optional, falls back to auto-generated) ───────────

export async function generateReasoningWithGemini(
  cards: CardResult[],
  product: OPAgentInput['product'],
  model: import('@google/generative-ai').GenerativeModel
): Promise<{ cardReasonings: Record<string, string>; agentReasoning: string }> {
  try {

    const prompt = `
You are a credit card optimization expert. Given a product and card analysis results, generate reasoning strings.

Product: ${product.name}, Price: $${product.price}, Category: ${product.category}, Merchant: ${product.merchant}

Card results:
${cards.map(c => `- ${c.name} (key: ${c.cardKey}): Earn rate ${c.earn.earnAudit.rate}x, Points earned ${c.earn.actualPointsEarned.toLocaleString()}, Net cost $${c.cost.netCost.toFixed(2)}, ${c.earn.earnAudit.exclusionReason || 'No exclusions'}, ${c.earn.rotatingBonusApplied ? 'Rotating bonus active' : ''}, ${c.earn.portalBonusApplied ? `Portal bonus: ${c.earn.portalBonusName}` : ''}`).join('\n')}

Respond ONLY with JSON (no markdown):
{
  "cardReasonings": {
    "${cards[0].cardKey}": "1-2 sentence explanation of why this card is good/bad for this purchase",
    "${cards[1]?.cardKey || ''}": "1-2 sentence explanation",
    ...
  },
  "agentReasoning": "1 paragraph explaining the winner and why it's the best choice"
}
`.trim()

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

    return {
      cardReasonings: parsed.cardReasonings,
      agentReasoning: parsed.agentReasoning,
    }
  } catch (err) {
    logger.error({ err }, '[op-agent] Gemini reasoning failed, falling back to auto-generated')
    // Fall back to auto-generated reasoning
    const cardReasonings: Record<string, string> = {}
    for (const card of cards) {
      cardReasonings[card.cardKey] = generateAutoReasoning(card, product)
    }
    const winner = cards.sort((a, b) => a.cost.netCost - b.cost.netCost)[0]
    const agentReasoning = generateAgentReasoning(winner, cards, product)
    return { cardReasonings, agentReasoning }
  }
}

// ─── Main agent function ─────────────────────────────────────────────────────

export async function runOPAgent(
  input: OPAgentInput,
  model: import('@google/generative-ai').GenerativeModel
): Promise<AnalysisResult> {
  const { product, cards, cardKnowledgeMap, userMonthlyTxns, riskFreeRatePercent, billingCycleDays, userContext } = input

  // Pass 1: Deterministic math for all cards
  const cardResults: CardResult[] = []
  for (const cardKey of cards) {
    const cardKnowledge = cardKnowledgeMap[cardKey]
    if (!cardKnowledge) {
      logger.warn({ cardKey }, '[op-agent] Card knowledge not found, skipping')
      continue
    }

    const result = calculateCardResult(
      cardKey,
      cardKnowledge,
      {
        product,
        userMonthlyTxns,
        riskFreeRatePercent,
        billingCycleDays,
        userContext,
      }
    )
    cardResults.push(result)
  }

  if (cardResults.length === 0) {
    throw new Error('No valid cards found for analysis')
  }

  // Pass 2: Generate reasoning with Gemini (or fall back to auto-generated)
  const { cardReasonings, agentReasoning } = await generateReasoningWithGemini(cardResults, product, model)

  // Apply reasoning to cards
  for (const card of cardResults) {
    card.reasoning = cardReasonings[card.cardKey] || generateAutoReasoning(card, product)
  }

  // Sort by net cost (ascending)
  cardResults.sort((a, b) => a.cost.netCost - b.cost.netCost)

  const winner = cardResults[0]
  const industryWinner = [...cardResults].sort((a, b) => a.cost.industryCost - b.cost.industryCost)[0]

  const savingsVsIndustryUsd = winner.cost.industryCost - winner.cost.netCost
  const savingsVsBestAlternativeUsd = cardResults.length > 1
    ? Math.max(...cardResults.map(c => c.cost.netCost)) - winner.cost.netCost
    : 0

  return {
    product: { name: product.name, price: product.price, url: product.url },
    cards: cardResults,
    winner,
    industryWinner,
    agentReasoning,
    savingsVsIndustryUsd,
    savingsVsBestAlternativeUsd,
    userBehaviour: {
      actualAvgCppAchieved: userContext.behaviour?.actualAvgCppAchieved ?? null,
      redemptionCount90d: userContext.behaviour?.redemptionCount90d ?? 0,
    },
  }
}
