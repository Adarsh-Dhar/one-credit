// lib/cardBalanceHelpers.ts
//
// Helper functions for credit limit validation and balance calculations

import type { IFiatCard } from './models/FiatCard';
import { isPointsCard, isMilesCard } from './utils';

export interface CreditValidationResult {
  isValid: boolean;
  availableCredit: number;
  error?: string;
}

export interface PointsCalculationResult {
  pointsEarned: number;
  basePoints: number;
  earnRate: number;
}

/**
 * Calculate available credit for a card
 */
export function calculateAvailableCredit(card: IFiatCard): number {
  const creditLimit = card.credit_limit ?? 0;
  const balanceOwed = card.monthly_balance_owed ?? 0;
  return creditLimit - balanceOwed;
}

/**
 * Validate if a card has sufficient credit for a purchase
 */
export function validateSufficientCredit(
  card: IFiatCard,
  purchasePrice: number
): CreditValidationResult {
  const creditLimit = card.credit_limit;
  
  // If no credit limit is set, treat as unlimited
  if (creditLimit === undefined || creditLimit === null) {
    return {
      isValid: true,
      availableCredit: Infinity,
    };
  }

  const availableCredit = calculateAvailableCredit(card);

  if (availableCredit < purchasePrice) {
    return {
      isValid: false,
      availableCredit,
      error: `Insufficient credit. Available: $${availableCredit.toLocaleString()}, Required: $${purchasePrice.toLocaleString()}`,
    };
  }

  return {
    isValid: true,
    availableCredit,
  };
}

/**
 * Calculate points earned for a purchase based on card's earn rate
 * This is a simplified version - the full calculation uses the op-agent
 */
export function calculatePointsEarned(
  card: IFiatCard,
  price: number,
  category: string
): PointsCalculationResult {
  const baseRate = card.rewards_structure?.base_multiplier ?? 1;
  let earnRate = baseRate;

  // Check for category bonuses
  const fixedCategories = card.rewards_structure?.fixed_categories || [];
  const categoryMatch = fixedCategories.find(cat =>
    category.toLowerCase().includes(cat.category.toLowerCase())
  );

  if (categoryMatch) {
    earnRate = categoryMatch.multiplier;
  }

  // Check for rotating categories
  const rotatingCategories = card.rewards_structure?.rotating_categories;
  if (rotatingCategories?.is_active && rotatingCategories.active_categories) {
    const rotatingMatch = rotatingCategories.active_categories.some(cat =>
      category.toLowerCase().includes(cat.toLowerCase())
    );
    if (rotatingMatch && rotatingCategories.multiplier) {
      earnRate = rotatingCategories.multiplier;
    }
  }

  const basePoints = (price * baseRate) / 100;
  const totalPoints = (price * earnRate) / 100;

  return {
    pointsEarned: totalPoints,
    basePoints,
    earnRate,
  };
}

/**
 * Calculate tokens earned for USD cards
 */
export function calculateTokensEarned(
  card: IFiatCard,
  price: number
): number {
  const tokenVelocity = card.op_redemption?.token_velocity ?? 1.0;
  return price * tokenVelocity;
}

/**
 * Determine which balance field to update based on card currency type
 */
export function getBalanceUpdateField(card: IFiatCard): 'points_balance' | 'credit_token_balance' {
  if (isPointsCard(card.currency_type) || isMilesCard(card.currency_type)) {
    return 'points_balance';
  }
  return 'credit_token_balance';
}
