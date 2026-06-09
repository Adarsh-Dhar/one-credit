// lib/op-agent/reasoning.ts
//
// Reasoning generation for the Optimization Agent
// Auto-generated reasoning (fallback) and Gemini AI reasoning

import type { CardResult, OPAgentInput } from './types'
import logger from '@/lib/logger'

export function generateAutoReasoning(card: CardResult, product: OPAgentInput['product']): string {
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
    const cardReasonings: Record<string, string> = {}
    for (const card of cards) {
      cardReasonings[card.cardKey] = generateAutoReasoning(card, product)
    }
    const winner = [...cards].sort((a, b) => a.cost.netCost - b.cost.netCost)[0]
    const agentReasoning = generateAgentReasoning(winner, cards, product)
    return { cardReasonings, agentReasoning }
  }
}
