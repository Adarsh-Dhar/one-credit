// lib/cardTransformers.ts
//
// Shared card transformation utilities to avoid duplication

import { IFiatCard } from './models/FiatCard';
import { CARD_TYPE_COLORS, buildEarnRates } from './card-constants';
import { isCashbackCard, isPointsCard, isMilesCard } from './utils';
import { MULTIPLIER_DEFAULTS } from './constants';

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

interface CommonCardFields {
  earnRates: Record<string, number>;
  pointsValueCents: number;
  cardType: string;
  currency: string;
  perks: string[];
}

function buildCommonCardFields(card: IFiatCard): CommonCardFields {
  const rewardsStructure = card.rewards_structure || {};
  const pointsValueCents = card.points_value_cents || MULTIPLIER_DEFAULTS.BASE_MULTIPLIER;

  const earnRates = buildEarnRates(
    rewardsStructure.fixed_categories || [],
    rewardsStructure.base_multiplier
  );

  const perks = [
    ...(card.benefits_and_credits?.airline_perks || []),
    ...(card.benefits_and_credits?.general_perks || []),
  ];

  return {
    earnRates,
    pointsValueCents,
    cardType: card.card_type,
    currency: card.currency_type.toLowerCase(),
    perks,
  };
}

function getTransferPartners(card: IFiatCard): TransferPartner[] {
  return card.benefits_and_credits?.transfer_partners || [];
}

function buildPointsProgram(
  card: IFiatCard,
  pointsValueCents: number
): {
  name: string;
  cppMin: number;
  cppMax: number;
} | null {
  if (!isPointsCard(card.currency_type) && !isMilesCard(card.currency_type)) {
    return null;
  }
  const transferPartners = getTransferPartners(card);
  const cppMin = transferPartners.length > 0
    ? Math.min(...transferPartners.map((p: TransferPartner) => p.cpp_min))
    : pointsValueCents;
  const cppMax = transferPartners.length > 0
    ? Math.max(...transferPartners.map((p: TransferPartner) => p.cpp_max))
    : pointsValueCents;
  return {
    name: card.points_program_name || 'Unknown',
    cppMin,
    cppMax,
  };
}

export function transformFiatCardToWalletDetail(card: IFiatCard, value: number): WalletCardDetail {
  const common = buildCommonCardFields(card);
  const pointsProgram = buildPointsProgram(card, common.pointsValueCents);

  return {
    key: card.card_id,
    name: card.display_name,
    issuer: card.network,
    type: common.cardType,
    color: CARD_TYPE_COLORS[common.cardType] || CARD_TYPE_COLORS.general,
    currency: common.currency,
    balance: card.current_balance_owed || 0,
    limit: card.credit_limit || 0,
    value,
    earnRates: common.earnRates,
    redemptionRate: card.redemption_rate_display || (isCashbackCard(card.currency_type) ? '$1.00' : `1 Point = $${(common.pointsValueCents / 100).toFixed(2)}`),
    statementCredits: card.benefits_and_credits?.statement_credits || [],
    portalBonuses: card.benefits_and_credits?.portal_bonuses || [],
    protections: card.benefits_and_credits?.purchase_protections || null,
    transferPartners: getTransferPartners(card),
    pointsProgram,
    perks: common.perks,
    annualFee: card.financials?.annual_fee || 0,
    cardImageUrl: card.card_image_url || '',
    cardDescription: card.card_description || '',
    pros: card.pros || [],
    cons: card.cons || [],
    features: card.features || []
  };
}
