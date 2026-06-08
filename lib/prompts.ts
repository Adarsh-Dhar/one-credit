// DEPRECATED: buildPaymentPrompt was used for the legacy MCP-tool agent flow.
// The pay flow (usePayFlow) is currently broken as it calls /api/rum/analyze
// which is for RUM persona inference, not payment analysis.
// The correct endpoint for payment analysis is /api/extension/analyze.
// TODO: Remove this function when the pay flow is refactored to use the correct API.
export function buildPaymentPrompt(amount: string, merchantName: string, categoryLabel: string, userId: string): string {
  return `
    User wants to spend $${amount} at ${merchantName} (${categoryLabel} category).
    User ID: ${userId}

    MATH RULE: card.earnRates[category] is a whole number (e.g., 3 = 3%, NOT 0.03).
    CORRECT: $${amount} × (earnRate / 100) = USD earned
    Example: $${amount} at 3% → $${(parseFloat(amount) * 0.03).toFixed(2)} USD
    WRONG: $${amount} × 3 = $${parseFloat(amount) * 3} USD (100× error)

    1. Call sync_rewards to get fresh offer data
    2. Call get_rewards_offers for category "${categoryLabel}"
    3. Call search_rewards_by_merchant for "${merchantName}"
    4. Call getUserBalances for userId "${userId}"
    5. For each card, analyze:
       - Statement credits that match this category (check merchant_categories)
       - Portal bonuses that apply to this category
       - Purchase protections that are relevant (extended warranty, purchase protection, cell phone protection, etc.)
    6. Calculate totalValue = cashReward + creditFired_USD + protectionEstimate_USD + portalBonusValue_USD
    7. Recommend the card with the HIGHEST totalValue

    Respond ONLY as JSON (no markdown):
    {
      "bestCard": "display name of card",
      "bestCardKey": "card key from balances",
      "nativeReward": <native currency earned (miles, points, cash)>,
      "rewardRate": <rate as decimal e.g. 0.05>,
      "reasoning": "one sentence why this card has the highest total value",
      "offerFound": true/false,
      "offerSource": "cardlytics|network|affiliate|none",
      "creditFired": { "name": "statement credit name", "amount": <USD amount> },
      "portalUsed": { "name": "portal name", "url": "portal URL" },
      "protectionNotes": ["protection note 1", "protection note 2"],
      "totalValue": <total value in USD>
    }
  `;
}
