// lib/cards.ts

import { connectDB } from './mongodb';
import { FiatCard, IFiatCard } from './models/FiatCard';
import logger from '@/lib/logger';
import { CARD_TYPE_COLORS, buildEarnRates } from './card-constants';

export type CardKey = string;

export interface CardDefinition {
  key: CardKey;
  name: string;
  issuer: string;
  type: 'travel' | 'dining' | 'cashback' | 'fuel' | 'shopping' | 'crypto' | 'general' | 'business' | 'student';
  color: string;          // gradient CSS string
  currency: string;       // what it earns — "miles", "points", "cash", etc.
  defaultBalance: number; // starting balance for demo users
  pointsProgramKey?: string; // key for TRANSFER_CPP lookup (e.g., 'chase_ur', 'amex_mr')
  // Card design/marketing information
  cardImageUrl?: string;
  cardDescription?: string;
  pros?: string[];
  cons?: string[];
  features?: string[];
  // Earn multipliers per category (e.g. 3 = 3x points per $1 spent, 0.06 = 6% cash back)
  earnRates: {
    flights: number;
    hotel: number;
    dining: number;
    electronics: number;
    groceries: number;
    fuel: number;
    shopping: number;
    crypto: number;
    general: number;
  };
  annualFee: number;
  perks: string[];
}

// Color mapping based on card type - now using shared constants from card-constants.ts

// Map points program names to TRANSFER_CPP lookup keys
function mapProgramName(programName: string | null | undefined): string | undefined {
  if (!programName) {
    return undefined;
  }
  const lower = programName.toLowerCase();
  if (lower.includes('ultimate rewards')) {
    return 'chase_ur';
  }
  if (lower.includes('membership rewards')) {
    return 'amex_mr';
  }
  if (lower.includes('venture rewards')) {
    return 'cap1_miles';
  }
  if (lower.includes('thankyou')) {
    return 'citi_ty';
  }
  if (lower.includes('hilton honors')) {
    return 'hilton';
  }
  if (lower.includes('marriott bonvoy')) {
    return 'marriott';
  }
  return undefined;
}

const CARD_TYPE_PATTERNS: Array<{
  matches: (cardType: string, displayName: string, currencyType: string) => boolean
  type: CardDefinition['type']
}> = [
  { matches: (cardType) => cardType === 'business', type: 'business' },
  { matches: (_, displayName) => displayName.toLowerCase().includes('student'), type: 'student' },
  { matches: (_, displayName, currencyType) => currencyType === 'MILES' || displayName.toLowerCase().includes('travel') || displayName.toLowerCase().includes('sapphire'), type: 'travel' },
  { matches: (_, displayName) => displayName.toLowerCase().includes('dining') || displayName.toLowerCase().includes('restaurant'), type: 'dining' },
  { matches: (_, displayName, currencyType) => currencyType === 'USD' || displayName.toLowerCase().includes('cash'), type: 'cashback' },
  { matches: (_, displayName) => displayName.toLowerCase().includes('fuel') || displayName.toLowerCase().includes('gas'), type: 'fuel' },
  { matches: (_, displayName) => displayName.toLowerCase().includes('shop') || displayName.toLowerCase().includes('online'), type: 'shopping' },
  { matches: (_, displayName) => displayName.toLowerCase().includes('crypto'), type: 'crypto' },
]

function inferCardType(cardType: string, displayName: string, currencyType: string): CardDefinition['type'] {
  return CARD_TYPE_PATTERNS.find(({ matches }) => matches(cardType, displayName, currencyType))?.type ?? 'general'
}

// Transform FiatCard to CardDefinition
function transformFiatCard(fiatCard: IFiatCard): CardDefinition {
  const { card_id, display_name, network, card_type, currency_type, financials, rewards_structure, benefits_and_credits } = fiatCard;

  // Determine card type for UI
  const type = inferCardType(card_type, display_name, currency_type)

  // Extract earn rates from rewards structure using shared function
  const earnRates = buildEarnRates(
    rewards_structure.fixed_categories || [],
    rewards_structure.base_multiplier || 1.0
  );

  // Calculate default balance based on currency type - use credit_token_balance (rewards) not current_balance_owed (debt)
  let defaultBalance = 0;
  if (currency_type === 'POINTS') {
    defaultBalance = fiatCard.points_balance || 30000;
  } else if (currency_type === 'MILES') {
    defaultBalance = 50000;
  } else {
    defaultBalance = fiatCard.credit_token_balance || 150;
  }


  // Combine perks
  const perks = [
    ...(benefits_and_credits.airline_perks || []),
    ...(benefits_and_credits.general_perks || []),
    ...(benefits_and_credits.statement_credits || []).map(c => `${c.name} (${c.amount_usd} USD)`),
  ];

  return {
    key: card_id,
    name: display_name,
    issuer: network,
    type,
    color: CARD_TYPE_COLORS[type] || CARD_TYPE_COLORS.general,
    currency: currency_type.toLowerCase(),
    defaultBalance,
    pointsProgramKey: mapProgramName(fiatCard.points_program_name),
    cardImageUrl: fiatCard.card_image_url,
    cardDescription: fiatCard.card_description,
    pros: fiatCard.pros,
    cons: fiatCard.cons,
    features: fiatCard.features,
    earnRates,
    annualFee: financials.annual_fee,
    perks,
  };
}

// Fetch cards from database
export async function getCards(userId: string): Promise<CardDefinition[]> {
  if (!userId) {
    throw new Error('userId is required');
  }
  try {
    await connectDB();
    const fiatCards = await FiatCard.find({ user_id: userId }).lean();
    return fiatCards.map(transformFiatCard);
  } catch (error) {
    logger.error({ error }, 'Error fetching cards from database');
    return [];
  }
}

// Helper: get a card by key
export async function getCard(key: CardKey, userId: string): Promise<CardDefinition | undefined> {
  if (!userId) {
    throw new Error('userId is required');
  }
  try {
    await connectDB();
    const fiatCard = await FiatCard.findOne({ user_id: userId, card_id: key })
      .select({
        card_id: 1,
        display_name: 1,
        network: 1,
        card_type: 1,
        currency_type: 1,
        credit_token_balance: 1,
        points_balance: 1,
        points_value_cents: 1,
        current_balance_owed: 1,
        credit_limit: 1,
        rewards_structure: 1,
        benefits_and_credits: 1,
        financials: 1,
        card_image_url: 1,
        card_description: 1,
        pros: 1,
        cons: 1,
        features: 1,
        op_redemption: 1,
      })
      .lean();
    if (!fiatCard) {
      return undefined;
    }
    return transformFiatCard(fiatCard);
  } catch (error) {
    logger.error({ error }, 'Error fetching card from database');
    return undefined;
  }
}

// Helper: compute totalValue from a balances object (sync version - cards already passed in)
export function computeTotalValue(balances: Record<string, number>, cards: CardDefinition[]): number {
  return cards.reduce((sum, card) => sum + (balances[card.key] ?? 0), 0);
}