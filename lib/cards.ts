// lib/cards.ts

import { connectDB } from './mongodb';
import { FiatCard, IFiatCard } from './models/FiatCard';

export type CardKey = string;

export interface CardDefinition {
  key: CardKey;
  name: string;
  issuer: string;
  type: 'travel' | 'dining' | 'cashback' | 'fuel' | 'shopping' | 'crypto' | 'general' | 'business' | 'student';
  color: string;          // gradient CSS string
  currency: string;       // what it earns — "miles", "points", "cash", etc.
  defaultBalance: number; // starting balance for demo users
  opRate: number;         // how many OP per 1 unit of currency
  // Earn rates per category (OP per $1 spent)
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

// Transform FiatCard to CardDefinition
function transformFiatCard(fiatCard: IFiatCard): CardDefinition {
  const { card_id, display_name, network, card_type, currency_type, financials, rewards_structure, benefits_and_credits } = fiatCard;
  
  // Determine card type for UI
  let type: CardDefinition['type'] = 'general';
  if (card_type === 'business') type = 'business';
  else if (display_name.toLowerCase().includes('student')) type = 'student';
  else if (currency_type === 'MILES' || display_name.toLowerCase().includes('travel') || display_name.toLowerCase().includes('sapphire')) type = 'travel';
  else if (display_name.toLowerCase().includes('dining') || display_name.toLowerCase().includes('restaurant')) type = 'dining';
  else if (currency_type === 'USD' || display_name.toLowerCase().includes('cash')) type = 'cashback';
  else if (display_name.toLowerCase().includes('fuel') || display_name.toLowerCase().includes('gas')) type = 'fuel';
  else if (display_name.toLowerCase().includes('shop') || display_name.toLowerCase().includes('online')) type = 'shopping';
  else if (display_name.toLowerCase().includes('crypto')) type = 'crypto';

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
      
      if (category.includes('travel') || category.includes('flight')) earnRates.flights = multiplier;
      if (category.includes('hotel') || category.includes('lodging')) earnRates.hotel = multiplier;
      if (category.includes('dining') || category.includes('restaurant')) earnRates.dining = multiplier;
      if (category.includes('electronics') || category.includes('tech')) earnRates.electronics = multiplier;
      if (category.includes('grocer') || category.includes('supermarket')) earnRates.groceries = multiplier;
      if (category.includes('gas') || category.includes('fuel') || category.includes('station')) earnRates.fuel = multiplier;
      if (category.includes('shop') || category.includes('online') || category.includes('retail')) earnRates.shopping = multiplier;
    }
  }

  // Calculate default balance based on currency type
  let defaultBalance = 0;
  if (currency_type === 'POINTS') defaultBalance = (fiatCard as any).points_balance || 30000;
  else if (currency_type === 'MILES') defaultBalance = 50000;
  else defaultBalance = (fiatCard.current_balance_owed || 0) * -1 || 150;

  // Calculate OP rate based on rewards
  const opRate = currency_type === 'USD' ? 100 : (rewards_structure.base_multiplier || 1.5);

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
    opRate,
    earnRates,
    annualFee: financials.annual_fee,
    perks,
  };
}

// Fetch cards from database
export async function getCards(userId: string = 'usr_88374'): Promise<CardDefinition[]> {
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
export async function getCard(key: CardKey, userId: string = 'usr_88374'): Promise<CardDefinition | undefined> {
  try {
    await connectDB();
    const fiatCard = await FiatCard.findOne({ user_id: userId, card_id: key }).lean();
    if (!fiatCard) return undefined;
    return transformFiatCard(fiatCard);
  } catch (error) {
    console.error('Error fetching card from database:', error);
    return undefined;
  }
}

// Helper: compute totalOp from a balances object
export async function computeTotalOp(balances: Record<string, number>, userId: string = 'usr_88374'): Promise<number> {
  const cards = await getCards(userId);
  return cards.reduce((sum, card) => sum + (balances[card.key] ?? 0) * card.opRate, 0);
}
