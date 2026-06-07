// lib/op-agent.ts
//
// Optimization Agent for product-specific purchase analysis.
// Calculates which card to use for a specific purchase based on deterministic math,
// then uses Gemini only for generating reasoning strings.
//
// This is a two-pass design:
// - Pass 1: Deterministic math (earn rates, CPP, fees, float value, etc.) - no AI
// - Pass 2: Gemini only for reasoning strings (falls back to auto-generated if AI fails)

import { GoogleGenerativeAI } from '@google/generative-ai'
import logger from '@/lib/logger'
import type { UserContext } from '@/lib/userContext'

// ─── Constants ───────────────────────────────────────────────────────────────

const INDUSTRY_STANDARD_CPP = 1.0
const FLOAT_PERIOD_DAYS = 30
const DAYS_PER_YEAR = 365

// ─── Types matching SidePanel.tsx ─────────────────────────────────────────────

interface CalculationContext {
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

export interface CardResult {
  cardKey: string
  name: string
  issuer: string
  actualPointsEarned: number
  earnAudit: EarnAudit
  bestRedemptionName: string
  bestRedemptionRatePerPoint: number
  trueRewardValueUsd: number
  industryRewardValue: number
  feeBurdenUsd: number
  floatValueUsd: number
  netCost: number
  industryCost: number
  savings: number
  effectiveDiscountPercent: number
  reasoning: string
  portalBonusApplied: boolean
  portalBonusName: string | null
  portalBonusUrl: string | null
  realisticCpp: number
  conservativeCpp: number
  industryAssumedCpp: number
  basePointsEarned: number
  bonusPointsEarned: number
  existingPoints: { balance: number; valueUsd: number; note: string } | null
  statementCreditApplied: number
  feeWaiverActive: boolean
  feeWaiverNote: string | null
  rotatingBonusApplied: boolean
  foreignFeeUsd: number
  rewardType: 'points' | 'miles' | 'cashback'
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

function calculateCardResult(
  cardKey: string,
  card: CardKnowledge,
  ctx: CalculationContext
): CardResult {
  const { product, userMonthlyTxns, riskFreeRatePercent, userContext } = ctx
  const price = product.price
  const isEmi = product.isEmi
  const category = product.category.toLowerCase()

  // Determine earn rate
  let earnRate = card.earnRules[0]?.rate ?? 1 // Default to base rate
  let confirmedEarn = true
  let exclusionReason: string | null = null
  let capBreached = false
  let basePoints = 0
  let bonusPoints = 0
  let rotatingBonusApplied = false
  let portalBonusApplied = false
  let portalBonusName: string | null = null
  let portalBonusUrl: string | null = null

  // Check exclusions
  if (card.excludedCategories.some(exc => category.includes(exc.toLowerCase()))) {
    confirmedEarn = false
    exclusionReason = `Category "${category}" is excluded for this card`
    earnRate = 0
  }

  // Check rotating category bonus
  if (card.rotatingCategory?.isActive && card.rotatingCategory.activeCategories.some(cat => category.includes(cat.toLowerCase()))) {
    earnRate = card.rotatingCategory.multiplier
    bonusPoints = (price * (earnRate - card.earnRules[0].rate)) / 100
    rotatingBonusApplied = true
  }

  // Check portal bonuses
  for (const bonus of card.portalBonuses) {
    if (bonus.categories.some(cat => category.includes(cat.toLowerCase()))) {
      earnRate = bonus.bonusMultiplier
      portalBonusApplied = true
      portalBonusName = bonus.portalName
      portalBonusUrl = bonus.portalUrl
      bonusPoints = (price * (earnRate - card.earnRules[0].rate)) / 100
      break
    }
  }

  // EMI override
  if (isEmi && card.emiEarnRate > 0) {
    earnRate = card.emiEarnRate
  }

  // Check monthly cap
  if (card.monthlyCapPoints && (price * earnRate / 100) > card.monthlyCapPoints) {
    capBreached = true
    earnRate = (card.monthlyCapPoints * 100) / price
  }

  // Calculate points
  basePoints = (price * card.earnRules[0].rate) / 100
  const totalPoints = (price * earnRate) / 100
  bonusPoints = totalPoints - basePoints

  // CPP tiers
  const conservativeCpp = card.redemptionPaths[0]?.ratePerPoint ?? 1.0
  const realisticCpp = userContext.behaviour?.actualAvgCppAchieved ?? card.bestRedemptionRatePerPoint
  const industryAssumedCpp = INDUSTRY_STANDARD_CPP

  // Calculate reward value
  const trueRewardValueUsd = (totalPoints * realisticCpp) / 100
  const industryRewardValue = (totalPoints * industryAssumedCpp) / 100

  // Fee burden (amortized over monthly transactions)
  const feeBurdenUsd = card.annualFeeUsd / 12 / userMonthlyTxns
  const feeWaiverActive = card.feeWaiverSpendUsd ? userContext.behaviour?.monthlyAvgSpendUsd >= card.feeWaiverSpendUsd : false
  const feeWaiverNote = feeWaiverActive ? 'Waived based on spend' : null

  // Float value (30-day grace period at risk-free rate)
  const floatValueUsd = (price * riskFreeRatePercent / 100) * (FLOAT_PERIOD_DAYS / DAYS_PER_YEAR)

  // Statement credits
  let statementCreditApplied = 0
  for (const sc of card.statementCredits) {
    if (sc.merchantCategories.some(cat => category.includes(cat.toLowerCase()))) {
      statementCreditApplied = sc.annualValueUsd / 12 // Monthly average
      break
    }
  }

  // Foreign transaction fee
  const foreignFeeUsd = product.isForeignMerchant ? (price * card.foreignTxnFeePct / 100) : 0

  // Calculate net cost
  const netCost = price - trueRewardValueUsd + feeBurdenUsd - floatValueUsd + foreignFeeUsd - statementCreditApplied
  const industryCost = price - industryRewardValue + feeBurdenUsd - floatValueUsd + foreignFeeUsd - statementCreditApplied
  const savings = industryCost - netCost
  const effectiveDiscountPercent = ((price - netCost) / price) * 100

  // Build earn audit
  const earnAudit: EarnAudit = {
    rate: earnRate,
    per: 100,
    confirmedEarn,
    exclusionReason,
    capBreached,
  }

  return {
    cardKey,
    name: card.name,
    issuer: card.issuer,
    actualPointsEarned: totalPoints,
    earnAudit,
    bestRedemptionName: card.bestRedemptionName,
    bestRedemptionRatePerPoint: card.bestRedemptionRatePerPoint,
    trueRewardValueUsd,
    industryRewardValue,
    feeBurdenUsd,
    floatValueUsd,
    netCost,
    industryCost,
    savings,
    effectiveDiscountPercent,
    reasoning: '', // Will be filled by Gemini or auto-generated
    portalBonusApplied,
    portalBonusName,
    portalBonusUrl,
    realisticCpp,
    conservativeCpp,
    industryAssumedCpp,
    basePointsEarned: basePoints,
    bonusPointsEarned: bonusPoints,
    existingPoints: null,
    statementCreditApplied,
    feeWaiverActive,
    feeWaiverNote,
    rotatingBonusApplied,
    foreignFeeUsd,
    rewardType: card.rewardType,
  }
}

// ─── Auto-generated reasoning (fallback if Gemini fails) ───────────────────

function generateAutoReasoning(card: CardResult, product: OPAgentInput['product']): string {
  const parts: string[] = []

  if (card.earnAudit.exclusionReason) {
    parts.push(card.earnAudit.exclusionReason)
  } else {
    parts.push(`Earns ${card.earnAudit.rate}x on ${product.category}`)
  }

  if (card.rotatingBonusApplied) {
    parts.push('Rotating category bonus active')
  }

  if (card.portalBonusApplied) {
    parts.push(`Portal bonus via ${card.portalBonusName}`)
  }

  if (card.statementCreditApplied > 0) {
    parts.push(`Statement credit applied: $${card.statementCreditApplied.toFixed(2)}`)
  }

  if (card.feeWaiverActive) {
    parts.push('Annual fee waived based on spend')
  }

  if (card.foreignFeeUsd > 0) {
    parts.push(`Foreign transaction fee: $${card.foreignFeeUsd.toFixed(2)}`)
  }

  parts.push(`Effective cost: $${card.netCost.toFixed(2)}`)

  return parts.join('. ') + '.'
}

function generateAgentReasoning(winner: CardResult, allCards: CardResult[], product: OPAgentInput['product']): string {
  const savingsVsIndustry = winner.industryCost - winner.netCost
  const savingsVsBest = allCards.length > 1 ? Math.max(...allCards.map(c => c.netCost)) - winner.netCost : 0

  return `${winner.name} is the best choice for this ${product.category} purchase at $${product.price.toFixed(2)}. It earns ${winner.earnAudit.rate}x (${winner.actualPointsEarned.toLocaleString()} points) with an effective cost of $${winner.netCost.toFixed(2)}. You save $${savingsVsIndustry.toFixed(2)} compared to industry valuation${savingsVsBest > 0 ? ` and $${savingsVsBest.toFixed(2)} vs the next best card` : ''}.`
}

// ─── Gemini reasoning pass (optional, falls back to auto-generated) ───────────

async function generateReasoningWithGemini(
  cards: CardResult[],
  product: OPAgentInput['product'],
  apiKey: string
): Promise<{ cardReasonings: Record<string, string>; agentReasoning: string }> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `
You are a credit card optimization expert. Given a product and card analysis results, generate reasoning strings.

Product: ${product.name}, Price: $${product.price}, Category: ${product.category}, Merchant: ${product.merchant}

Card results:
${cards.map(c => `- ${c.name} (key: ${c.cardKey}): Earn rate ${c.earnAudit.rate}x, Points earned ${c.actualPointsEarned.toLocaleString()}, Net cost $${c.netCost.toFixed(2)}, ${c.earnAudit.exclusionReason || 'No exclusions'}, ${c.rotatingBonusApplied ? 'Rotating bonus active' : ''}, ${c.portalBonusApplied ? `Portal bonus: ${c.portalBonusName}` : ''}`).join('\n')}

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
    const winner = cards.sort((a, b) => a.netCost - b.netCost)[0]
    const agentReasoning = generateAgentReasoning(winner, cards, product)
    return { cardReasonings, agentReasoning }
  }
}

// ─── Main agent function ─────────────────────────────────────────────────────

export async function runOPAgent(
  input: OPAgentInput,
  geminiApiKey: string
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
  const { cardReasonings, agentReasoning } = await generateReasoningWithGemini(cardResults, product, geminiApiKey)

  // Apply reasoning to cards
  for (const card of cardResults) {
    card.reasoning = cardReasonings[card.cardKey] || generateAutoReasoning(card, product)
  }

  // Sort by net cost (ascending)
  cardResults.sort((a, b) => a.netCost - b.netCost)

  const winner = cardResults[0]
  const industryWinner = [...cardResults].sort((a, b) => a.industryCost - b.industryCost)[0]

  const savingsVsIndustryUsd = winner.industryCost - winner.netCost
  const savingsVsBestAlternativeUsd = cardResults.length > 1
    ? Math.max(...cardResults.map(c => c.netCost)) - winner.netCost
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
