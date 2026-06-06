// lib/cards.ts

import { connectDB } from './mongodb';
import { FiatCard, IFiatCard } from './models/FiatCard';
import logger from '@/lib/logger';

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

// Color mapping based on card type
const typeToColor: Record<string, string> = {
  travel: 'from-blue-600 to-indigo-800',
  dining: 'from-yellow-500 to-orange-600',
  cashback: 'from-emerald-500 to-teal-700',
  fuel: 'from-orange-500 to-red-600',
  shopping: 'from-violet-500 to-purple-700',
  crypto: 'from-yellow-400 to-amber-600',
  general: 'from-cyan-500 to-blue-600',
  business: 'from-slate-600 to-slate-800',
  student: 'from-pink-500 to-rose-700',
};

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

// Transform FiatCard to CardDefinition
function transformFiatCard(fiatCard: IFiatCard): CardDefinition {
  const { card_id, display_name, network, card_type, currency_type, financials, rewards_structure, benefits_and_credits } = fiatCard;
  
  // Determine card type for UI
  let type: CardDefinition['type'] = 'general';
  if (card_type === 'business') {
type = 'business';
} else if (display_name.toLowerCase().includes('student')) {
type = 'student';
} else if (currency_type === 'MILES' || display_name.toLowerCase().includes('travel') || display_name.toLowerCase().includes('sapphire')) {
type = 'travel';
} else if (display_name.toLowerCase().includes('dining') || display_name.toLowerCase().includes('restaurant')) {
type = 'dining';
} else if (currency_type === 'USD' || display_name.toLowerCase().includes('cash')) {
type = 'cashback';
} else if (display_name.toLowerCase().includes('fuel') || display_name.toLowerCase().includes('gas')) {
type = 'fuel';
} else if (display_name.toLowerCase().includes('shop') || display_name.toLowerCase().includes('online')) {
type = 'shopping';
} else if (display_name.toLowerCase().includes('crypto')) {
type = 'crypto';
}

  // Extract earn rates from rewards structure
  const earnRates = {
    flights: 1.0,
    hotel: 1.0,
    dining: 1.0,
    electronics: 1.0,
    groceries: 1.0,
    fuel: 1.0,
    shopping: 1.0,
    crypto: 1.0,
    general: rewards_structure.base_multiplier || 1.0,
  };

  // Map fixed categories to earn rates
  if (rewards_structure.fixed_categories) {
    for (const cat of rewards_structure.fixed_categories) {
      const category = cat.category.toLowerCase();
      const multiplier = cat.multiplier;
      
      if (category.includes('travel') || category.includes('flight')) {
earnRates.flights = multiplier;
}
      if (category.includes('hotel') || category.includes('lodging')) {
earnRates.hotel = multiplier;
}
      if (category.includes('dining') || category.includes('restaurant')) {
earnRates.dining = multiplier;
}
      if (category.includes('electronics') || category.includes('tech')) {
earnRates.electronics = multiplier;
}
      if (category.includes('grocer') || category.includes('supermarket')) {
earnRates.groceries = multiplier;
}
      if (category.includes('gas') || category.includes('fuel') || category.includes('station')) {
earnRates.fuel = multiplier;
}
      if (category.includes('shop') || category.includes('online') || category.includes('retail')) {
earnRates.shopping = multiplier;
}
    }
  }

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
    color: typeToColor[type] || typeToColor.general,
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
    console.error('Error fetching cards from database:', error);
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