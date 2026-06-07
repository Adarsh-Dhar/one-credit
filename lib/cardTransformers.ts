// lib/cardTransformers.ts
//
// Shared card transformation utilities to avoid duplication

import { IFiatCard } from './models/FiatCard';
import { CARD_TYPE_COLORS, buildEarnRates } from './card-constants';

export interface StatementCredit {
  name: string;
  amount_usd: number;
  reset_period: string;
  merchant_categories?: string[];
}

export interface PortalBonus {
  portal_name: string;
  portal_url: string;
  categories: string[];
  bonus_multiplier: number;
  bonus_type: string;
}

export interface TransferPartner {
  program: string;
  ratio: string;
  cpp_min: number;
  cpp_max: number;
}

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
  statementCredits: StatementCredit[];
  portalBonuses: PortalBonus[];
  protections: unknown | null;
  transferPartners: TransferPartner[];
  pointsProgram: {
    name: string;
    cppMin: number;
    cppMax: number;
  } | null;
  perks: string[];
  annualFee: number;
  cardImageUrl: string;
  cardDescription: string;
  pros: string[];
  cons: string[];
  features: string[];
}


export function transformFiatCardToWalletDetail(card: IFiatCard, value: number): WalletCardDetail {
  const rewardsStructure = card.rewards_structure || {};
  const pointsValueCents = card.points_value_cents || 1.0;

  const earnRates = buildEarnRates(
    rewardsStructure.fixed_categories || [],
    rewardsStructure.base_multiplier
  );

  // Build points program info for POINTS-type cards
  let pointsProgram = null;
  if (card.currency_type === 'POINTS' || card.currency_type === 'MILES') {
    const transferPartners = card.benefits_and_credits?.transfer_partners || [];
    const cppMin = transferPartners.length > 0 ? Math.min(...transferPartners.map((p: TransferPartner) => p.cpp_min)) : pointsValueCents;
    const cppMax = transferPartners.length > 0 ? Math.max(...transferPartners.map((p: TransferPartner) => p.cpp_max)) : pointsValueCents;
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
  return CARD_TYPE_COLORS[cardType] || CARD_TYPE_COLORS.general;
}
