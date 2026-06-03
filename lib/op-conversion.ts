// lib/op-conversion.ts
//
// Complete OP token conversion logic for all reward types.
// Based on the axiom: 100 OP = $1.00 USD
//
// Every reward type is converted to USD first, then multiplied by 100 to get OP.

// ─── Constants ───────────────────────────────────────────────────────────────

export const OP_PER_USD = 100;

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

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TotalValueResult {
  // Type 1 — earn rate OP
  baseOp: number;
  earnRateUsd: number;
  portalOp: number;
  portalUsd: number;
  portalName: string | null;

  // Type 2 — statement credits
  creditOp: number;
  creditUsd: number;
  creditName: string | null;

  // Type 3 — portal/partner bonus (replaces base for issuer portals)
  additionalPortalOp: number;
  additionalPortalUsd: number;

  // Type 4 — protection estimate
  protectionOp: number;
  protectionUsd: number;
  protectionLabels: string[];

  // Type 5 — transfer range (only for POINTS cards)
  earnedOp_min: number;
  earnedOp_max: number;

  // Totals
  totalOp: number;
  totalUsd: number;
  confidence: 'direct' | 'derived' | 'estimated';
}

export interface CardForConversion {
  currency: string;             // 'usd' | 'points' | 'miles'
  opRate: number;              // OP per unit of currency (100 for USD)
  earnRates: Record<string, number>;
  pointsProgram?: {
    cppMin: number;
    cppMax: number;
    name: string;
  };
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

// ─── Main function ───────────────────────────────────────────────────────────

export function computeTotalValue(
  card: CardForConversion,
  spendAmount: number,
  categoryKey: string
): TotalValueResult {
  const result: TotalValueResult = {
    // Type 1 — earn rate OP
    baseOp: 0,
    earnRateUsd: 0,
    portalOp: 0,
    portalUsd: 0,
    portalName: null,

    // Type 2 — statement credits
    creditOp: 0,
    creditUsd: 0,
    creditName: null,

    // Type 3 — portal/partner bonus (replaces base for issuer portals)
    additionalPortalOp: 0,
    additionalPortalUsd: 0,

    // Type 4 — protection estimate
    protectionOp: 0,
    protectionUsd: 0,
    protectionLabels: [],

    // Type 5 — transfer range (only for POINTS cards)
    earnedOp_min: 0,
    earnedOp_max: 0,

    // Totals
    totalOp: 0,
    totalUsd: 0,
    confidence: 'direct',
  };

  // ── TYPE 1: Base earn rate ──────────────────────────────────────
  const earnRate = card.earnRates[categoryKey] ?? card.earnRates.general ?? 1;
  const cashReward = spendAmount * (earnRate / 100);

  if (card.currency === 'usd') {
    result.earnRateUsd = cashReward;
    result.baseOp = cashReward * OP_PER_USD;
  } else {
    // Points card — use cpp range
    const cpp_min = card.pointsProgram?.cppMin ?? 1.0;
    const cpp_max = card.pointsProgram?.cppMax ?? 1.0;
    const points = spendAmount * (earnRate / 100) * (card.opRate / 1);
    result.earnedOp_min = points * cpp_min;
    result.earnedOp_max = points * cpp_max;
    result.earnRateUsd = points * cpp_min / OP_PER_USD; // conservative for comparison
    result.baseOp = result.earnedOp_min;
    result.confidence = 'derived';
  }

  // ── TYPE 2: Statement credits ───────────────────────────────────
  for (const credit of card.statementCredits ?? []) {
    if (!credit.merchant_categories.includes(categoryKey)) continue;
    const available = credit.amount_usd - (credit.amount_redeemed ?? 0);
    if (available <= 0) continue;
    const fired = Math.min(available, spendAmount);
    result.creditUsd += fired;
    result.creditOp += fired * OP_PER_USD;
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
      result.portalOp = portalCash * OP_PER_USD;
      result.portalName = bestPortal.portal_name;
      // portalOp replaces baseOp — only use for display, not totalOp
    } else {
      // Affiliate/shopping portal — additive on top of base
      const addCash = spendAmount * (bestPortal.bonus_multiplier / 100);
      result.additionalPortalUsd = addCash;
      result.additionalPortalOp = addCash * OP_PER_USD;
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
  result.protectionOp = protUsd * OP_PER_USD;
  if (protUsd > 0) result.confidence = 'estimated';

  // ── TOTALS ──────────────────────────────────────────────────────
  // Portal OP: base if no portal, additivePortal stacks, issuer portal shown separately
  result.totalUsd = result.earnRateUsd
    + result.creditUsd
    + result.additionalPortalUsd
    + result.protectionUsd;

  result.totalOp = result.totalUsd * OP_PER_USD;

  return result;
}
