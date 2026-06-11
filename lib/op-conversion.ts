// lib/op-conversion.ts
//
// Complete value conversion logic for all reward types.
// All values are in USD.

// ─── Constants ───────────────────────────────────────────────────────────────

export const PROTECTION_RATES = {
  extended_warranty: 0.07,      // 7% of purchase price
  purchase_protection: 0.03,   // 3% (theft/accidental damage ~90d)
  return_protection: 0.02,     // 2% (store refuses return ~90d)
  cell_phone_monthly: 15.00,    // flat $15/mo amortized value
  trip_cancellation: 0.04,      // 4% of trip cost
  primary_rental_cdw: 12.00,    // flat $12/day avoided rental insurance
} as const;

export const PERK_VALUES = {
  lounge_visit: 50,             // $50 avoided airport food/drink
  free_night_cert: 150,         // avg mid-tier hotel night
  companion_cert: 250,          // avg flight taxes saved
  global_entry_credit: 100,     // $100 TSA/GE fee, once per 4.5yr
  priority_boarding: 0,         // convenience, no direct cash value
  elite_status_nights: 0,        // indirect — not per-transaction
} as const;

export const TRANSFER_CPP: Record<string, { min: number; max: number }> = {
  chase_ur:   { min: 1.0, max: 2.1 },   // max: Hyatt
  amex_mr:    { min: 0.6, max: 1.8 },   // max: Air France / Virgin Atlantic
  cap1_miles: { min: 1.0, max: 1.7 },   // max: Turkish / Avianca
  citi_ty:    { min: 1.0, max: 1.7 },   // max: Turkish Airlines
  hilton:     { min: 0.4, max: 0.6 },
  marriott:   { min: 0.7, max: 0.9 },
};

const PERK_TRIGGERS: Record<string, { keyword: string; category: string; value: number }[]> = {
  'Global Entry credit':    [{ keyword: 'global entry', category: 'travel', value: PERK_VALUES.global_entry_credit }],
  'TSA PreCheck credit':    [{ keyword: 'tsa precheck', category: 'travel', value: PERK_VALUES.global_entry_credit }],
  'Priority Pass lounges':  [{ keyword: 'lounge', category: 'travel', value: PERK_VALUES.lounge_visit }],
  'Priority Pass Select':   [{ keyword: 'lounge', category: 'travel', value: PERK_VALUES.lounge_visit }],
  'Free night award':       [{ keyword: 'hotel', category: 'hotel', value: PERK_VALUES.free_night_cert }],
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TotalValueResult {
  // Type 1 — earn rate
  baseValue: number;
  earnRateUsd: number;
  portalValue: number;
  portalUsd: number;
  portalName: string | null;

  // Type 2 — statement credits
  creditValue: number;
  creditUsd: number;
  creditName: string | null;

  // Type 3 — portal/partner bonus (replaces base for issuer portals)
  additionalPortalValue: number;
  additionalPortalUsd: number;

  // Type 4 — protection estimate
  protectionValue: number;
  protectionUsd: number;
  protectionLabels: string[];

  // Type 5 — transfer range (only for POINTS cards)
  earnedValue_min: number;
  earnedValue_max: number;

  // Type 6 — experiential perks (display only, not in totalValue)
  perkValue: number;
  perkUsd: number;
  perkName: string | null;

  // Totals
  totalValue: number;
  confidence: 'direct' | 'derived' | 'estimated';
}

export interface CardForConversion {
  currency: string;             // 'usd' | 'points' | 'miles'
  earnRates: Record<string, number>;
  pointsProgram?: {
    cppMin: number;
    cppMax: number;
    name: string;
  };
  actualAvgCppAchieved?: number | null;
  perks?: string[];            // experiential perks from card data
  statementCredits?: Array<{
    name: string;
    amount_usd: number;
    amount_redeemed?: number;
    reset_period: string;
    merchant_categories: string[];
  }>;
  portalBonuses?: Array<{
    portal_name: string;
    portal_url: string;
    categories: string[];
    bonus_multiplier: number;
    bonus_type: 'multiplier' | 'flat_pct';
  }>;
  protections?: {
    extended_warranty: boolean;
    purchase_protection_days: number;
    return_protection_days: number;
    cell_phone_protection: boolean;
    trip_cancellation: boolean;
    primary_rental_cdw: boolean;
  };
}

// ─── Helper function ───────────────────────────────────────────────────────────

export function walletCardToConversionCard(card: {
  currency: string;
  earnRates: Record<string, number>;
  pointsProgram?: { name: string; cppMin: number; cppMax: number } | null;
  actualAvgCppAchieved?: number | null;
  perks?: string[];
  statementCredits?: Array<{ name: string; amount_usd: number; amount_redeemed?: number; reset_period: string; merchant_categories?: string[] }>;
  portalBonuses?: Array<{ portal_name: string; portal_url: string; categories: string[]; bonus_multiplier: number; bonus_type: 'multiplier' | 'flat_pct' }>;
  protections?: { extended_warranty: boolean; purchase_protection_days: number; return_protection_days: number; cell_phone_protection: boolean; trip_cancellation: boolean; primary_rental_cdw: boolean };
}): CardForConversion {
  return {
    currency: card.currency,
    earnRates: card.earnRates,
    pointsProgram: card.pointsProgram ? {
      cppMin: card.pointsProgram.cppMin,
      cppMax: card.pointsProgram.cppMax,
      name: card.pointsProgram.name,
    } : undefined,
    actualAvgCppAchieved: card.actualAvgCppAchieved ?? null,
    perks: card.perks,
    statementCredits: card.statementCredits?.map(credit => ({
      ...credit,
      merchant_categories: credit.merchant_categories ?? [],
    })),
    portalBonuses: card.portalBonuses,
    protections: card.protections,
  };
}

// ─── Main function ───────────────────────────────────────────────────────────

export function computeTotalValue(
  card: CardForConversion,
  spendAmount: number,
  categoryKey: string
): TotalValueResult {
  const result: TotalValueResult = {
    // Type 1 — earn rate
    baseValue: 0,
    earnRateUsd: 0,
    portalValue: 0,
    portalUsd: 0,
    portalName: null,

    // Type 2 — statement credits
    creditValue: 0,
    creditUsd: 0,
    creditName: null,

    // Type 3 — portal/partner bonus (replaces base for issuer portals)
    additionalPortalValue: 0,
    additionalPortalUsd: 0,

    // Type 4 — protection estimate
    protectionValue: 0,
    protectionUsd: 0,
    protectionLabels: [],

    // Type 5 — transfer range (only for POINTS cards)
    earnedValue_min: 0,
    earnedValue_max: 0,

    // Type 6 — experiential perks (display only, not in totalValue)
    perkValue: 0,
    perkUsd: 0,
    perkName: null,

    // Totals
    totalValue: 0,
    confidence: 'direct',
  };

  // ── TYPE 1: Base earn rate ──────────────────────────────────────
  const earnRate = card.earnRates[categoryKey] ?? card.earnRates.general ?? 1;
  const cashReward = spendAmount * (earnRate / 100);

  if (card.currency === 'usd') {
    result.earnRateUsd = cashReward;
    result.baseValue = cashReward;
  } else {
    // Points card — use centsPerPoint range
    const centsPerPointMin = card.pointsProgram?.cppMin ?? 1.0;
    const centsPerPointMax = card.pointsProgram?.cppMax ?? 1.0;
    const realisticCpp = card.actualAvgCppAchieved ?? card.pointsProgram?.cppMax ?? centsPerPointMin;
    const points = spendAmount * (earnRate / 100);
    result.earnedValue_min = points * centsPerPointMin;
    result.earnedValue_max = points * centsPerPointMax;
    result.earnRateUsd = points * realisticCpp;  // consistent with agent
    result.baseValue = result.earnedValue_min;
    result.confidence = 'derived';
  }

  // ── TYPE 2: Statement credits ───────────────────────────────────
  for (const credit of card.statementCredits ?? []) {
    if (!credit.merchant_categories.includes(categoryKey)) {
continue;
}
    const available = credit.amount_usd - (credit.amount_redeemed ?? 0);
    if (available <= 0) {
continue;
}
    const fired = Math.min(available, spendAmount);
    result.creditUsd += fired;
    result.creditValue += fired;
    result.creditName = credit.name;
    break; // only one credit fires per transaction
  }

  // ── TYPE 3: Portal bonuses ──────────────────────────────────────
  const bestPortal = (card.portalBonuses ?? [])
    .filter(p => p.categories.includes(categoryKey))
    .sort((a, b) => b.bonus_multiplier - a.bonus_multiplier)[0];

  if (bestPortal) {
    if (bestPortal.bonus_type === 'multiplier') {
      // Issuer portal — show as alternative to base (not stacked)
      const portalCash = spendAmount * (bestPortal.bonus_multiplier / 100);
      result.portalUsd = portalCash;
      result.portalValue = portalCash;
      result.portalName = bestPortal.portal_name;
      // portalValue replaces baseValue — only use for display, not totalValue
    } else {
      // Affiliate/shopping portal — additive on top of base
      const addCash = spendAmount * (bestPortal.bonus_multiplier / 100);
      result.additionalPortalUsd = addCash;
      result.additionalPortalValue = addCash;
      result.portalName = bestPortal.portal_name;
    }
  }

  // ── TYPE 4: Purchase protections ───────────────────────────────
  const p = card.protections;
  let protUsd = 0;

  if (p?.extended_warranty && categoryKey === 'electronics' && spendAmount >= 200) {
    protUsd += spendAmount * PROTECTION_RATES.extended_warranty;
    result.protectionLabels.push('Extended warranty');
  }
  if (p?.purchase_protection_days && p.purchase_protection_days > 0) {
    protUsd += spendAmount * PROTECTION_RATES.purchase_protection;
    result.protectionLabels.push('Purchase protection');
  }
  if (p?.return_protection_days && p.return_protection_days > 0 && ['shopping', 'electronics'].includes(categoryKey)) {
    protUsd += spendAmount * PROTECTION_RATES.return_protection;
    result.protectionLabels.push('Return protection');
  }
  if (p?.cell_phone_protection && categoryKey === 'subscription') {
    protUsd += PROTECTION_RATES.cell_phone_monthly;
    result.protectionLabels.push('Cell phone protection');
  }
  if (p?.trip_cancellation && categoryKey === 'travel') {
    protUsd += spendAmount * PROTECTION_RATES.trip_cancellation;
    result.protectionLabels.push('Trip cancellation');
  }
  if (p?.primary_rental_cdw && categoryKey === 'travel') {
    protUsd += PROTECTION_RATES.primary_rental_cdw;
    result.protectionLabels.push('Rental CDW');
  }
  result.protectionUsd = protUsd;
  result.protectionValue = protUsd;
  if (protUsd > 0) {
result.confidence = 'estimated';
}

  // ── TYPE 6: Experiential perks ───────────────────────────────────
  // Check if any perk triggers based on category and add amortized value (display only)
  for (const perk of card.perks ?? []) {
    const triggers = PERK_TRIGGERS[perk];
    if (!triggers) {
continue;
}

    for (const trigger of triggers) {
      if (categoryKey.includes(trigger.keyword) || trigger.category === categoryKey) {
        result.perkUsd += trigger.value;
        result.perkName = perk;
        break; // only one perk fires per transaction
      }
    }
  }
  result.perkValue = result.perkUsd;

  // ── TOTALS ──────────────────────────────────────────────────────
  // Portal value: base if no portal, additivePortal stacks, issuer portal shown separately
  result.totalValue = result.earnRateUsd
    + result.creditUsd
    + result.additionalPortalUsd
    + result.protectionUsd;

  return result;
}
