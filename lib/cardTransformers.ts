// lib/cardTransformers.ts
//
// Shared card transformation utilities to avoid duplication

import { IFiatCard } from './models/FiatCard';

export interface WalletCardDetail {
  key: string;
  name: string;
  issuer: string;
  type: string;
  color: string;
  currency: string;
  balance: number;
  limit: number;
  value: number;
  earnRates: Record<string, number>;
  redemptionRate: string;
  statementCredits: any[];
  portalBonuses: any[];
  protections: any;
  transferPartners: any[];
  pointsProgram: {
    name: string;
    cppMin: number;
    cppMax: number;
  } | null;
  perks: any[];
  annualFee: number;
  cardImageUrl: string;
  cardDescription: string;
  pros: string[];
  cons: string[];
  features: string[];
}

function getCategoryMultiplier(fixedCategories: any[], targetCategory: string): number {
  const categoryMap: Record<string, string> = {
    flights: 'travel',
    hotel: 'lodging',
    dining: 'restaurant',
    groceries: 'grocery',
    fuel: 'gas',
    shopping: 'retail',
    pharmacy: 'drugstore',
    electronics: 'electronics',
    streaming: 'streaming',
  };
  const normalizedTarget = categoryMap[targetCategory] || targetCategory;
  return fixedCategories.find((c: any) => c.category === normalizedTarget)?.multiplier ?? 1;
}

export function transformFiatCardToWalletDetail(card: IFiatCard, value: number): WalletCardDetail {
  const rewardsStructure = card.rewards_structure || {};
  const pointsValueCents = card.points_value_cents || 1.0;

  const earnRates = {
    flights: getCategoryMultiplier(rewardsStructure.fixed_categories || [], 'flights'),
    hotel: getCategoryMultiplier(rewardsStructure.fixed_categories || [], 'hotel'),
    dining: getCategoryMultiplier(rewardsStructure.fixed_categories || [], 'dining'),
    groceries: getCategoryMultiplier(rewardsStructure.fixed_categories || [], 'groceries'),
    fuel: getCategoryMultiplier(rewardsStructure.fixed_categories || [], 'fuel'),
    shopping: getCategoryMultiplier(rewardsStructure.fixed_categories || [], 'shopping'),
    pharmacy: getCategoryMultiplier(rewardsStructure.fixed_categories || [], 'pharmacy'),
    electronics: getCategoryMultiplier(rewardsStructure.fixed_categories || [], 'electronics'),
    streaming: getCategoryMultiplier(rewardsStructure.fixed_categories || [], 'streaming'),
    general: rewardsStructure.base_multiplier,
  };

  // Build points program info for POINTS-type cards
  let pointsProgram = null;
  if (card.currency_type === 'POINTS' || card.currency_type === 'MILES') {
    const transferPartners = card.benefits_and_credits?.transfer_partners || [];
    const cppMin = transferPartners.length > 0 ? Math.min(...transferPartners.map((p: any) => p.cpp_min)) : pointsValueCents;
    const cppMax = transferPartners.length > 0 ? Math.max(...transferPartners.map((p: any) => p.cpp_max)) : pointsValueCents;
    pointsProgram = {
      name: card.points_program_name || 'Unknown',
      cppMin,
      cppMax,
    };
  }

  return {
    key: card.card_id,
    name: card.display_name,
    issuer: card.network,
    type: card.card_type,
    color: getCardColor(card.card_type),
    currency: card.currency_type.toLowerCase(),
    balance: card.current_balance_owed || 0,
    limit: card.credit_limit || 0,
    value,
    earnRates,
    redemptionRate: card.redemption_rate_display || (card.currency_type === 'USD' ? '$1.00' : `1 Point = $${(pointsValueCents / 100).toFixed(2)}`),
    statementCredits: card.benefits_and_credits?.statement_credits || [],
    portalBonuses: card.benefits_and_credits?.portal_bonuses || [],
    protections: card.benefits_and_credits?.purchase_protections || null,
    transferPartners: card.benefits_and_credits?.transfer_partners || [],
    pointsProgram,
    perks: [
      ...(card.benefits_and_credits?.airline_perks || []),
      ...(card.benefits_and_credits?.general_perks || []),
    ],
    annualFee: card.financials?.annual_fee || 0,
    cardImageUrl: card.card_image_url || '',
    cardDescription: card.card_description || '',
    pros: card.pros || [],
    cons: card.cons || [],
    features: card.features || []
  };
}

function getCardColor(cardType: string): string {
  const typeColors: Record<string, string> = {
    travel: 'from-blue-600 to-purple-600',
    dining: 'from-orange-500 to-red-600',
    cashback: 'from-green-500 to-emerald-600',
    fuel: 'from-yellow-500 to-orange-600',
    shopping: 'from-pink-500 to-rose-600',
    crypto: 'from-violet-500 to-purple-600',
    general: 'from-slate-500 to-slate-700',
    business: 'from-indigo-600 to-blue-600',
    student: 'from-teal-500 to-cyan-600',
  };
  return typeColors[cardType] || typeColors.general;
}
