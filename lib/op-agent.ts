// lib/op-agent.ts
//
// Optimization Agent for product-specific purchase analysis.
// Calculates which card to use for a specific purchase based on deterministic math,
// then uses Gemini only for generating reasoning strings.
//
// This is a two-pass design:
// - Pass 1: Deterministic math (earn rates, centsPerPoint, fees, float value, etc.) - no AI
// - Pass 2: Gemini only for reasoning strings (falls back to auto-generated if AI fails)

import logger from '@/lib/logger'
import type { CardResult, AnalysisResult, OPAgentInput } from './op-agent/types'
import { calculateCardResult } from './op-agent/calculations'
import { generateReasoningWithGemini, generateAutoReasoning } from './op-agent/reasoning'

// Re-export types for backward compatibility
export type {
  CalculationContext,
  CardKnowledge,
  EarnAudit,
  EarnOutcome,
  CostBreakdown,
  Valuation,
  CardResult,
  AnalysisResult,
  OPAgentInput,
} from './op-agent/types'

// Re-export calculation functions for backward compatibility
export {
  checkCategoryExclusion,
  applyRotatingBonus,
  applyPortalBonus,
  applyEmiEarnRate,
  checkMonthlyCap,
  calculateCppTiers,
  calculateFeeBurden,
  resolveStatementCredit,
  calculateNetCost,
  calculatePointsEarned,
  buildEarnAudit,
  calculateCardResult,
} from './op-agent/calculations'

// Helper methods to reduce deep chaining
export function getCardExclusionReason(card: CardResult): string | null {
  return card.earn.earnAudit.exclusionReason
}

export function getCardEarnRate(card: CardResult): number {
  return card.earn.earnAudit.rate
}

export function getCardIndustryCost(card: CardResult): number {
  return card.cost.industryCost
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
