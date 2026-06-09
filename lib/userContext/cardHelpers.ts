// lib/userContext/cardHelpers.ts
//
// Helper functions for building card live state

import { IFiatCard } from '@/lib/models/FiatCard';
import { isCashbackCard } from '@/lib/utils';
import { CardLiveState } from './types';

function calculateCreditMetrics(card: IFiatCard): {
  limit: number | null
  owed: number
  available: number | null
  utilization: number | null
} {
  const limit = card.credit_limit ?? null
  const owed = card.current_balance_owed ?? 0
  const available = limit !== null ? limit - owed : null
  const utilization = limit ? (owed / limit) * 100 : null
  return { limit, owed, available, utilization }
}

function buildCategoryCapProgress(card: IFiatCard): CardLiveState['categoryCapProgress'] {
  return (card.rewards_structure.fixed_categories ?? [])
    .filter((fixedCategory) => fixedCategory.cap_amount_usd !== null && fixedCategory.cap_amount_usd !== undefined)
    .map((fixedCategory) => ({
      category: fixedCategory.category,
      spentTowardsCap: fixedCategory.current_spend_towards_cap ?? 0,
      capLimit: fixedCategory.cap_amount_usd ?? null,
      remainingCapRoom: fixedCategory.cap_amount_usd !== null && fixedCategory.cap_amount_usd !== undefined
        ? fixedCategory.cap_amount_usd - (fixedCategory.current_spend_towards_cap ?? 0)
        : null,
    }))
}

function calculatePointsValue(card: IFiatCard): number {
  const pointsBalance = card.points_balance ?? 0
  const hasOpTokenBalance = card.currency_type === 'USD'
    && card.op_redemption
    && (card.credit_token_balance ?? 0) > 0
  if (hasOpTokenBalance) {
    const tokenBalance = card.credit_token_balance ?? 0
    const centsPerToken = card.op_redemption!.op_cents_per_token / 100
    return parseFloat((tokenBalance * centsPerToken).toFixed(2))
  }
  const centsPerPoint = card.points_value_cents ?? 100
  return parseFloat((pointsBalance * (centsPerPoint / 100)).toFixed(2))
}

function buildOpTokenState(card: IFiatCard): CardLiveState['opTokenState'] {
  if (isCashbackCard(card.currency_type) && card.op_redemption) {
    const tokenBalance = card.credit_token_balance ?? 0
    const centsPerToken = card.op_redemption.op_cents_per_token
    const minThreshold = card.op_redemption.min_redeem_tokens
    return {
      tokenBalance,
      tokenValueUsd: parseFloat((tokenBalance * (centsPerToken / 100)).toFixed(2)),
      opCentsPerToken: centsPerToken,
      minRedeemThreshold: minThreshold,
      isTokenLow: tokenBalance < minThreshold,
    }
  }
  return null
}

export function buildCardLiveStates(
  cards: IFiatCard[],
  annualSpendByCard: Record<string, number>
): CardLiveState[] {
  return cards.map(card => {
    const { limit, owed, available, utilization } = calculateCreditMetrics(card)
    const categoryCapProgress = buildCategoryCapProgress(card)
    const pointsBalance = card.points_balance ?? 0
    const pointsValueUsd = calculatePointsValue(card)
    const opTokenState = buildOpTokenState(card)

    return {
      cardId: card.card_id,
      displayName: card.display_name,
      creditLimit: limit,
      currentBalanceOwed: owed,
      availableCredit: available,
      utilizationPct: utilization ? Math.round(utilization * 10) / 10 : null,
      standardAprPct: card.financials.standard_apr * 100,
      pointsBalance,
      pointsValueUsd,
      opTokenState,
      categoryCapProgress,
      annualSpendUsd: parseFloat((annualSpendByCard[card.card_id] ?? 0).toFixed(2)),
    }
  })
}

export function computeOpTotals(
  cardStates: CardLiveState[]
): { totalOpTokens: number; totalOpBalanceUsd: number } {
  let totalOpTokens = 0
  let totalOpBalanceUsd = 0

  for (const card of cardStates) {
    if (card.opTokenState) {
      totalOpTokens += card.opTokenState.tokenBalance
      totalOpBalanceUsd += card.opTokenState.tokenValueUsd
    }
  }

  return { totalOpTokens, totalOpBalanceUsd }
}
