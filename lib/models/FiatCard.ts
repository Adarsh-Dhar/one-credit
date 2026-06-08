// lib/models/FiatCard.ts
//
// Full Mongoose schema for a real-world (fiat) credit card entry.
// Covers both USD cash-back cards (e.g. Blue Cash Preferred) and
// points/miles cards (e.g. Ink Business Preferred).

import mongoose, { Document, Model, Schema } from 'mongoose';

// ─── Sub-document interfaces ──────────────────────────────────────────────────

export interface IPromos {
  intro_purchase_apr?: number;
  intro_purchase_apr_expiration?: Date;
  balance_transfer_fee_pct?: number;
  intro_bt_apr?: number;
  intro_bt_apr_expiration?: Date;
}

export interface IFinancials {
  annual_fee: number;
  foreign_transaction_fee_pct: number;
  standard_apr: number;
  fee_waiver_spend_usd?: number | null;
  fee_waiver_period?: 'annual' | 'anniversary_year' | null;
  promos?: IPromos;
}

export interface IFixedCategory {
  category: string;
  multiplier: number;
  cap_amount_usd?: number | null;
  cap_period?: string | null;          // e.g. "annual" | "anniversary_year"
  current_spend_towards_cap?: number;
  post_cap_multiplier?: number;
}

export interface IRotatingCategories {
  is_active: boolean;
  current_quarter?: string | null;
  active_categories?: string[];
  multiplier?: number | null;
}

export interface IMilestoneBonus {
  spend_threshold_usd: number;
  bonus_points: number;
  period: 'annual' | 'anniversary_year';
}

export interface IRewardsStructure {
  base_multiplier: number;
  fixed_categories?: IFixedCategory[];
  rotating_categories?: IRotatingCategories;
  milestone_bonuses?: IMilestoneBonus[];
  emi_multiplier?: number;
  monthly_cap_points?: number | null;
  excluded_categories?: string[];
}

export interface IStatementCredit {
  name: string;
  amount_usd: number;
  reset_period: string;               // e.g. "annual" | "monthly"
  amount_redeemed?: number;
  merchant_categories?: string[];    // e.g. ["streaming", "entertainment"]
}

export interface IPortalBonus {
  portal_name: string;
  portal_url: string;
  categories: string[];
  bonus_multiplier: number;
  bonus_type: 'multiplier' | 'flat_pct';
}

export interface IPurchaseProtections {
  extended_warranty: boolean;
  purchase_protection_days: number;
  return_protection_days: number;
  cell_phone_protection: boolean;
  trip_cancellation: boolean;
  primary_rental_cdw: boolean;
}

export interface ITransferPartner {
  program: string;
  ratio: string;
  cpp_min: number;
  cpp_max: number;
}

export interface IBenefitsAndCredits {
  statement_credits?: IStatementCredit[];
  portal_bonuses?: IPortalBonus[];
  purchase_protections?: IPurchaseProtections;
  transfer_partners?: ITransferPartner[];
  airline_perks?: string[];
  general_perks?: string[];
}

// ─── OP redemption catalog sub-document ──────────────────────────────────────

export interface IOpRedemption {
  op_cents_per_token: number;        // USD value of 1 OP token (e.g. 1.0 = 1¢)
  min_redeem_tokens: number;         // minimum tokens needed before redemption unlocks
  redeem_categories: string[];       // what tokens can be redeemed for, e.g. ['cashback','travel','merchandise']
  token_velocity: number;            // tokens earned per $1 spent (earn rate)
  appreciation_model: string;        // e.g. 'fixed' | 'tiered' | 'dynamic'
}

// ─── Top-level document interface ────────────────────────────────────────────

export interface IFiatCard extends Document {
  // Ownership
  user_id: string;                     // references the User._id (stored as string)

  // Card identity
  card_id: string;                     // caller-supplied stable ID, e.g. "card_amex_bcp_01"
  display_name: string;
  card_type: 'personal' | 'business';
  network: 'AMEX' | 'VISA' | 'MASTERCARD' | 'DISCOVER' | string;
  currency_type: 'USD' | 'POINTS' | 'MILES' | string;

  // Card design/marketing information
  card_image_url?: string;            // URL to card image
  card_description?: string;          // Marketing description
  pros?: string[];                    // Card pros
  cons?: string[];                    // Card cons
  features?: string[];                // Key features list

  // Balances (only one will be relevant depending on currency_type)
  current_balance_owed?: number;
  credit_limit?: number;
  points_balance?: number;
  credit_token_balance?: number;
  redemption_rate_display?: string;
  points_value_cents?: number;
  points_program_name?: string;

  // Nested objects
  financials: IFinancials;
  rewards_structure: IRewardsStructure;
  benefits_and_credits: IBenefitsAndCredits;
  op_redemption?: IOpRedemption;     // OP token redemption catalog (USD cards only)

  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const PromosSchema = new Schema<IPromos>(
  {
    intro_purchase_apr:             { type: Number },
    intro_purchase_apr_expiration:  { type: Date },
    balance_transfer_fee_pct:       { type: Number },
    intro_bt_apr:                   { type: Number },
    intro_bt_apr_expiration:        { type: Date },
  },
  { _id: false }
);

const FinancialsSchema = new Schema<IFinancials>(
  {
    annual_fee:                   { type: Number, required: true, default: 0 },
    foreign_transaction_fee_pct:  { type: Number, required: true, default: 0 },
    standard_apr:                 { type: Number, required: true },
    fee_waiver_spend_usd:         { type: Number, default: null },
    fee_waiver_period:            { type: String, default: null },
    promos:                       { type: PromosSchema, default: null },
  },
  { _id: false }
);

const FixedCategorySchema = new Schema<IFixedCategory>(
  {
    category:                   { type: String, required: true },
    multiplier:                 { type: Number, required: true },
    cap_amount_usd:             { type: Number, default: null },
    cap_period:                 { type: String, default: null },
    current_spend_towards_cap:  { type: Number, default: 0 },
    post_cap_multiplier:        { type: Number, default: 1.0 },
  },
  { _id: false }
);

const RotatingCategoriesSchema = new Schema<IRotatingCategories>(
  {
    is_active:         { type: Boolean, required: true, default: false },
    current_quarter:   { type: String, default: null },
    active_categories: { type: [String], default: [] },
    multiplier:        { type: Number, default: null },
  },
  { _id: false }
);

const MilestoneBonusSchema = new Schema<IMilestoneBonus>(
  {
    spend_threshold_usd: { type: Number, required: true },
    bonus_points:        { type: Number, required: true },
    period:              { type: String, required: true },
  },
  { _id: false }
);

const RewardsStructureSchema = new Schema<IRewardsStructure>(
  {
    base_multiplier:     { type: Number, required: true, default: 1.0 },
    fixed_categories:    { type: [FixedCategorySchema], default: [] },
    rotating_categories: { type: RotatingCategoriesSchema, default: { is_active: false } },
    milestone_bonuses:   { type: [MilestoneBonusSchema], default: [] },
    emi_multiplier:      { type: Number, default: null },
    monthly_cap_points:  { type: Number, default: null },
    excluded_categories: { type: [String], default: [] },
  },
  { _id: false }
);

const StatementCreditSchema = new Schema<IStatementCredit>(
  {
    name:               { type: String, required: true },
    amount_usd:         { type: Number, required: true },
    reset_period:       { type: String, required: true },
    amount_redeemed:    { type: Number, default: 0 },
    merchant_categories:{ type: [String], default: [] },
  },
  { _id: false }
);

const PortalBonusSchema = new Schema<IPortalBonus>(
  {
    portal_name:       { type: String, required: true },
    portal_url:        { type: String, required: true },
    categories:        { type: [String], required: true },
    bonus_multiplier:  { type: Number, required: true },
    bonus_type:        { type: String, enum: ['multiplier', 'flat_pct'], required: true },
  },
  { _id: false }
);

const PurchaseProtectionsSchema = new Schema<IPurchaseProtections>(
  {
    extended_warranty:       { type: Boolean, default: false },
    purchase_protection_days:{ type: Number, default: 0 },
    return_protection_days:  { type: Number, default: 0 },
    cell_phone_protection:   { type: Boolean, default: false },
    trip_cancellation:       { type: Boolean, default: false },
    primary_rental_cdw:      { type: Boolean, default: false },
  },
  { _id: false }
);

const TransferPartnerSchema = new Schema<ITransferPartner>(
  {
    program:  { type: String, required: true },
    ratio:    { type: String, required: true },
    cpp_min:  { type: Number, required: true },
    cpp_max:  { type: Number, required: true },
  },
  { _id: false }
);

const BenefitsAndCreditsSchema = new Schema<IBenefitsAndCredits>(
  {
    statement_credits:    { type: [StatementCreditSchema], default: [] },
    portal_bonuses:      { type: [PortalBonusSchema], default: [] },
    purchase_protections:{ type: PurchaseProtectionsSchema, default: null },
    transfer_partners:   { type: [TransferPartnerSchema], default: [] },
    airline_perks:        { type: [String], default: [] },
    general_perks:        { type: [String], default: [] },
  },
  { _id: false }
);

// ─── OP redemption sub-schema ─────────────────────────────────────────────────

const OpRedemptionSchema = new Schema<IOpRedemption>(
  {
    op_cents_per_token: { type: Number, required: true, default: 1.0 },
    min_redeem_tokens:  { type: Number, required: true, default: 0 },
    redeem_categories:  { type: [String], default: [] },
    token_velocity:     { type: Number, required: true, default: 1.0 },
    appreciation_model: { type: String, default: 'fixed' },
  },
  { _id: false }
);

// ─── Root schema ──────────────────────────────────────────────────────────────

const FiatCardSchema = new Schema<IFiatCard>(
  {
    user_id:      { type: String, required: true, index: true },

    card_id:      { type: String, required: true },   // caller-supplied stable ID
    display_name: { type: String, required: true },
    card_type:    { type: String, enum: ['personal', 'business'], required: true },
    network:      { type: String, required: true },
    currency_type:{ type: String, required: true },   // 'USD' | 'POINTS' | 'MILES' …

    // Card design/marketing information
    card_image_url:       { type: String, default: null },
    card_description:     { type: String, default: null },
    pros:                 { type: [String], default: [] },
    cons:                 { type: [String], default: [] },
    features:             { type: [String], default: [] },

    // Balance fields — one or both may be present depending on currency_type
    current_balance_owed: { type: Number, default: 0 },
    credit_limit:         { type: Number },
    points_balance:       { type: Number },
    credit_token_balance: { type: Number, default: 0 },
    redemption_rate_display: { type: String, default: '' },
    points_value_cents:   { type: Number },
    points_program_name:  { type: String },

    financials:            { type: FinancialsSchema,          required: true },
    rewards_structure:     { type: RewardsStructureSchema,    required: true },
    benefits_and_credits:  { type: BenefitsAndCreditsSchema,  required: true },
    op_redemption:         { type: OpRedemptionSchema,        default: null },
  },
  { timestamps: true }
);

// Compound index: one user should not have duplicate card_ids
FiatCardSchema.index({ user_id: 1, card_id: 1 }, { unique: true });

// Index for user queries - improves performance for user-specific card fetches
FiatCardSchema.index({ user_id: 1 });

// ─── Shared projection constant ───────────────────────────────────────────────────

// Canonical Mongoose projection for FiatCard queries
// Single source of truth for field selection across the codebase
export const FIAT_CARD_PROJECTION = {
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
} as const;

// ─── Model export ─────────────────────────────────────────────────────────────

export const FiatCard: Model<IFiatCard> =
  mongoose.models.FiatCard || mongoose.model<IFiatCard>('FiatCard', FiatCardSchema);