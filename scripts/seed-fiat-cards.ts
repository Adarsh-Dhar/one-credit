// scripts/seed-fiat-cards.ts
//
// Seed script to insert sample fiat credit cards into MongoDB.
// Uses upsert so running it multiple times is safe.
//
// Schema alignment notes (lib/models/FiatCard.ts):
//  - financials.promos uses expiration Dates, not duration strings
//  - points_balance  is the schema field for points/miles cards (not points_value_cents)
//  - credit_token_balance stores the OP-equivalent synthetic balance
//  - Fields not in the schema (welcome_bonus, cap_note, special_rules, annual_fee_note,
//    balance_transfer_fee_note, first_year_multiplier, recommended_credit_score) are
//    dropped — Mongoose silently discards unknown paths on strict schemas.

import 'dotenv/config';
import mongoose from 'mongoose';
import { FiatCard } from '../lib/models/FiatCard';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/omni-wallet';

// ---------------------------------------------------------------------------
// Date helpers — compute expiration Date objects from "account opening" offsets
// ---------------------------------------------------------------------------

/** Returns a Date that is `months` calendar months after today. */
function monthsFromNow(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Returns a Date that is `days` days after today. */
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/** Returns a Date that is `cycles` × 30 days after today (billing-cycle approximation). */
function cyclesFromNow(cycles: number): Date {
  return daysFromNow(cycles * 30);
}

// ---------------------------------------------------------------------------
// Sample fiat cards — every field mapped to a path that exists in IFiatCard
// ---------------------------------------------------------------------------

const sampleCards = [
  // ── 1. Blue Cash Preferred (AMEX) ─────────────────────────────────────────
  {
    user_id: 'usr_88374',
    card_id: 'card_amex_bcp_01',
    display_name: 'Blue Cash Preferred',
    card_type: 'personal',
    network: 'AMEX',
    currency_type: 'USD',
    current_balance_owed: 1247.83,
    credit_limit: 12500,
    // points_balance not applicable — USD cashback card
    financials: {
      annual_fee: 95,             // $0 intro first year, then $95
      foreign_transaction_fee_pct: 2.7,
      standard_apr: 19.49,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: monthsFromNow(12),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: monthsFromNow(12),
      },
    },
    rewards_structure: {
      base_multiplier: 1.0,
      fixed_categories: [
        {
          category: 'U.S. supermarkets',
          multiplier: 6.0,
          cap_amount_usd: 6000,
          cap_period: 'annual',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'U.S. gas stations',
          multiplier: 3.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'U.S. online retail',
          multiplier: 3.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Transit',
          multiplier: 3.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'U.S. streaming services',
          multiplier: 6.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
      ],
      rotating_categories: { is_active: false },
    },
    benefits_and_credits: {
      statement_credits: [
        {
          name: 'Streaming subscription credit',
          amount_usd: 20,
          reset_period: 'monthly',
          amount_redeemed: 0,
        },
      ],
      airline_perks: [],
      general_perks: ['Purchase protection', 'Extended warranty', 'Return protection'],
    },
  },

  // ── 2. Ink Business Preferred (Chase / VISA) ───────────────────────────────
  {
    user_id: 'usr_88374',
    card_id: 'card_chase_ink_01',
    display_name: 'Ink Business Preferred',
    card_type: 'business',
    network: 'VISA',
    currency_type: 'POINTS',
    current_balance_owed: 405.63,
    credit_limit: 35000,
    points_balance: 90000,        // welcome bonus points; redeems at 1.25¢/pt via Chase Travel
    financials: {
      annual_fee: 95,
      foreign_transaction_fee_pct: 0,
      standard_apr: 20.24,
      promos: {
        // No intro APR on this card; welcome bonus captured in points_balance above
      },
    },
    rewards_structure: {
      base_multiplier: 1.0,
      fixed_categories: [
        {
          category: 'Travel',
          multiplier: 3.0,
          cap_amount_usd: 150000,
          cap_period: 'anniversary_year',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Shipping',
          multiplier: 3.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Internet, cable, and phone services',
          multiplier: 3.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Advertising — social media and search engines',
          multiplier: 3.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
      ],
      rotating_categories: { is_active: false },
    },
    benefits_and_credits: {
      statement_credits: [
        {
          name: 'Global Entry / TSA PreCheck application fee credit',
          amount_usd: 100,
          reset_period: 'anniversary_year',
          amount_redeemed: 0,
        },
      ],
      airline_perks: [
        'Priority Pass Select lounge access',
        '1:1 point transfer to airline partners',
        'Travel insurance',
        'Rental car insurance',
        'No foreign transaction fees',
      ],
      general_perks: ['Purchase protection', 'Extended warranty', 'Cell phone protection'],
    },
  },

  // ── 3. Chase Sapphire Preferred (VISA) ────────────────────────────────────
  {
    user_id: 'usr_88374',
    card_id: 'card_chase_sapphire_01',
    display_name: 'Chase Sapphire Preferred',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'POINTS',
    current_balance_owed: 405.63,
    credit_limit: 25000,
    points_balance: 75000,        // current points balance; redeems at 1.25¢/pt via Chase Travel
    financials: {
      annual_fee: 95,
      foreign_transaction_fee_pct: 0,
      standard_apr: 19.24,
      promos: {
        // No intro APR on this card
      },
    },
    rewards_structure: {
      base_multiplier: 1.0,
      fixed_categories: [
        {
          category: 'Travel (Chase Travel bookings)',
          multiplier: 5.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Other travel',
          multiplier: 2.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Dining',
          multiplier: 3.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Online grocery',
          multiplier: 3.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Streaming services',
          multiplier: 3.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
      ],
      rotating_categories: { is_active: false },
    },
    benefits_and_credits: {
      statement_credits: [
        {
          name: 'Hotel stay credit',
          amount_usd: 50,
          reset_period: 'anniversary_year',
          amount_redeemed: 0,
        },
      ],
      airline_perks: [
        '1:1 point transfer to airline and hotel partners',
        'Trip cancellation insurance',
        'Trip interruption insurance',
        'No foreign transaction fees',
        'Primary rental car insurance',
        'Travel delay reimbursement',
      ],
      general_perks: ['Purchase protection', 'Extended warranty', 'Travel protection'],
    },
  },

  // ── 4. Ink Business Unlimited (Chase / VISA) ──────────────────────────────
  {
    user_id: 'usr_88374',
    card_id: 'card_chase_ink_unlimited_01',
    display_name: 'Ink Business Unlimited',
    card_type: 'business',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 8342.19,
    credit_limit: 35000,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 17.49,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: monthsFromNow(12),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: monthsFromNow(12),
      },
    },
    rewards_structure: {
      base_multiplier: 1.5,       // flat 1.5% cash back on all purchases — no bonus categories
      fixed_categories: [],
      rotating_categories: { is_active: false },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: ['Purchase protection', 'Extended warranty'],
    },
  },

  // ── 5. Discover it Student Chrome ─────────────────────────────────────────
  {
    user_id: 'usr_88374',
    card_id: 'card_discover_student_chrome_01',
    display_name: 'Discover it Student Chrome',
    card_type: 'personal',
    network: 'DISCOVER',
    currency_type: 'USD',
    current_balance_owed: 423.67,
    credit_limit: 2000,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 0,
      standard_apr: 18.74,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: monthsFromNow(6),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: monthsFromNow(6),
      },
    },
    rewards_structure: {
      base_multiplier: 1.0,
      fixed_categories: [
        {
          // Gas stations and restaurants share a single combined $1,000/quarter cap
          category: 'Gas stations',
          multiplier: 2.0,
          cap_amount_usd: 1000,
          cap_period: 'quarterly',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Restaurants',
          multiplier: 2.0,
          cap_amount_usd: 1000,
          cap_period: 'quarterly',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
      ],
      rotating_categories: { is_active: false },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: [
        'No foreign transaction fees',
        'Free FICO score',
        'Cashback match at end of first year',
        'Pay until midnight on due date',
        'Referral bonuses',
      ],
    },
  },

  // ── 6. Capital One Quicksilver Student Cash Rewards ───────────────────────
  {
    user_id: 'usr_88374',
    card_id: 'card_capital_one_quicksilver_student_01',
    display_name: 'Capital One Quicksilver Student Cash Rewards',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 423.67,
    credit_limit: 2000,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 0,
      standard_apr: 19.99,
      promos: {},
    },
    rewards_structure: {
      base_multiplier: 1.5,       // flat 1.5% cash back — no bonus categories
      fixed_categories: [],
      rotating_categories: { is_active: false },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: [
        'No annual fee',
        'No foreign transaction fees',
        'Flat 1.5% cash back on all purchases',
        'Rewards never expire',
        'Referral bonuses (up to $500/year)',
      ],
    },
  },

  // ── 7. BofA Unlimited Cash Rewards for Students ───────────────────────────
  {
    user_id: 'usr_88374',
    card_id: 'card_bofa_student_unlimited_01',
    display_name: 'Bank of America Unlimited Cash Rewards for Students',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 891.45,
    credit_limit: 3000,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 18.24,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: cyclesFromNow(15),   // 15 billing cycles ≈ 450 days
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: cyclesFromNow(15),         // BT must be made within 60 days
      },
    },
    rewards_structure: {
      // Base 1.5%; Preferred Rewards customers earn 25–75% more (1.875–2.625% effective)
      base_multiplier: 1.5,
      fixed_categories: [],
      rotating_categories: { is_active: false },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: [
        'No annual fee',
        'Cash rewards never expire',
        'Preferred Rewards bonus (25–75% more for BofA customers)',
        'No caps or category restrictions on rewards',
        '$200 welcome bonus after $1,000 spend in first 90 days',
      ],
    },
  },

  // ── 8. Blue Cash Everyday (AMEX) ──────────────────────────────────────────
  {
    user_id: 'usr_88374',
    card_id: 'card_amex_everyday_01',
    display_name: 'Blue Cash Everyday',
    card_type: 'personal',
    network: 'AMEX',
    currency_type: 'USD',
    current_balance_owed: 2156.78,
    credit_limit: 7500,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 2.7,
      standard_apr: 19.49,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: monthsFromNow(15),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: monthsFromNow(15),
      },
    },
    rewards_structure: {
      base_multiplier: 1.0,
      fixed_categories: [
        {
          category: 'U.S. supermarkets',
          multiplier: 3.0,
          cap_amount_usd: 6000,
          cap_period: 'annual',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'U.S. gas stations',
          multiplier: 3.0,
          cap_amount_usd: 6000,
          cap_period: 'annual',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'U.S. online retail',
          multiplier: 3.0,
          cap_amount_usd: 6000,
          cap_period: 'annual',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
      ],
      rotating_categories: { is_active: false },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: ['Purchase protection', 'Extended warranty', 'Return protection', 'No annual fee'],
    },
  },

  // ── 9. Wells Fargo Active Cash ────────────────────────────────────────────
  {
    user_id: 'usr_88374',
    card_id: 'card_wells_active_cash_01',
    display_name: 'Wells Fargo Active Cash',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 3421.92,
    credit_limit: 10000,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 18.49,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: monthsFromNow(12),
        // BT fee is 3% for first 120 days, then up to 5%; using the standard 3%
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: monthsFromNow(12),    // BT must be made within 120 days
      },
    },
    rewards_structure: {
      base_multiplier: 2.0,       // unlimited 2% cash rewards on all purchases
      fixed_categories: [],
      rotating_categories: { is_active: false },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: [
        'Cell phone protection (up to $600, $25 deductible)',
        'Purchase protection',
        'Extended warranty',
        'No annual fee',
        'Unlimited 2% cash rewards — no categories, no caps',
        '$200 welcome bonus after $500 spend in first 90 days',
      ],
    },
  },

  // ── 10. BofA Customized Cash Rewards for Students ─────────────────────────
  {
    user_id: 'usr_88374',
    card_id: 'card_bofa_customized_cash_student_01',
    display_name: 'Bank of America Customized Cash Rewards for Students',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 1567.34,
    credit_limit: 5000,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 17.49,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: cyclesFromNow(15),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: cyclesFromNow(15),         // BT within 60 days of account opening
      },
    },
    rewards_structure: {
      base_multiplier: 1.0,
      fixed_categories: [
        {
          // Choice category: user picks one from online shopping / gas / dining /
          // travel / drug stores / home improvement — changeable once per month.
          // First year earns 6× (vs 3× after); modelled here at the standard 3×.
          category: 'Choice category (online shopping, gas, dining, travel, drug stores, home improvement)',
          multiplier: 3.0,
          cap_amount_usd: 2500,
          cap_period: 'quarterly',   // combined cap with groceries + wholesale clubs
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Grocery stores',
          multiplier: 2.0,
          cap_amount_usd: 2500,
          cap_period: 'quarterly',   // combined cap with choice category + wholesale clubs
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Wholesale clubs',
          multiplier: 2.0,
          cap_amount_usd: 2500,
          cap_period: 'quarterly',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
      ],
      rotating_categories: { is_active: false },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: [
        'No annual fee',
        'Preferred Rewards bonus (25–75% more for BofA customers)',
        'Cash rewards never expire',
        'Change choice category once per calendar month',
        '6% choice-category bonus in year one (3% thereafter)',
        '$200 welcome bonus after $1,000 spend in first 90 days',
        'Helps build credit history',
      ],
    },
  },

  // ── 11. BofA Customized Cash Rewards (standard) ───────────────────────────
  {
    user_id: 'usr_88374',
    card_id: 'card_bofa_customized_cash_01',
    display_name: 'Bank of America Customized Cash Rewards',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 2789.56,
    credit_limit: 8000,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 17.49,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: cyclesFromNow(15),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: cyclesFromNow(15),         // BT within 60 days
      },
    },
    rewards_structure: {
      base_multiplier: 1.0,
      fixed_categories: [
        {
          category: 'Choice category (online shopping, gas, dining, travel, drug stores, home improvement)',
          multiplier: 3.0,
          cap_amount_usd: 2500,
          cap_period: 'quarterly',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Groceries',
          multiplier: 2.0,
          cap_amount_usd: 2500,
          cap_period: 'quarterly',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Wholesale clubs',
          multiplier: 2.0,
          cap_amount_usd: 2500,
          cap_period: 'quarterly',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
      ],
      rotating_categories: { is_active: false },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: [
        'No annual fee',
        'Preferred Rewards bonus (25–75% more for BofA customers)',
        'Cash rewards never expire',
        'Change choice category once per calendar month',
        '$200 welcome bonus after $1,000 spend in first 90 days',
      ],
    },
  },

  // ── 12. Wells Fargo Reflect ───────────────────────────────────────────────
  {
    user_id: 'usr_88374',
    card_id: 'card_wells_reflect_01',
    display_name: 'Wells Fargo Reflect',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 4567.23,
    credit_limit: 15000,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 18.49,
      promos: {
        // Primary selling point: industry-leading 21-month 0% intro APR
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: monthsFromNow(21),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: monthsFromNow(21),
      },
    },
    rewards_structure: {
      // No rewards program — pure 0% APR / balance-transfer card
      base_multiplier: 1.0,
      fixed_categories: [],
      rotating_categories: { is_active: false },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: [
        'Cell phone protection',
        'Purchase protection',
        'Extended warranty',
        'No annual fee',
        'Industry-leading 21-month 0% intro APR on purchases and qualifying BTs',
      ],
    },
  },

  // ── 13. Chase Freedom Unlimited ───────────────────────────────────────────
  {
    user_id: 'usr_88374',
    card_id: 'card_chase_freedom_unlimited_01',
    display_name: 'Chase Freedom Unlimited',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 324.50,
    credit_limit: 12000,
    // points_balance not applicable — this card earns cash-back (presented as points
    // redeemable at 1¢/pt, but the card itself is effectively a USD cashback card)
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 18.24,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: monthsFromNow(15),
        balance_transfer_fee_pct: 5,    // 5% (min $5)
        intro_bt_apr: 0,
        intro_bt_apr_expiration: monthsFromNow(15),
      },
    },
    rewards_structure: {
      base_multiplier: 1.5,       // 1.5% on all other purchases
      fixed_categories: [
        {
          category: 'Travel (Chase Travel bookings)',
          multiplier: 5.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Dining',
          multiplier: 3.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Drugstores',
          multiplier: 3.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
      ],
      rotating_categories: { is_active: false },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: [
        'No annual fee',
        'Purchase protection',
        'Extended warranty',
        'Cell phone protection',
        '$200 welcome bonus after $500 spend in first 90 days',
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Dynamic rate generation
// ---------------------------------------------------------------------------

function generateRandomRate(min: number, max: number): number {
  // Generates a random float between min and max, rounded to 2 decimal places
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

async function seed() {
  try {
    console.log('🔌 Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Loop through the cards and inject dynamic rates
    const cardsWithDynamicRates = sampleCards.map(card => {
      // Generate a random market multiplier between 0.8x and 2.5x
      const marketMultiplier = generateRandomRate(0.8, 2.5);
      
      let calculatedOpBalance = 0;
      let displayRate = '';

      if (card.currency_type === 'USD') {
        // Assume the "Available Cash Back" is 10% of their credit limit for a realistic mock
        const availableCashBack = card.credit_limit * 0.10; 
        
        // Multiply by 100 to get base cents, then apply the random market multiplier
        calculatedOpBalance = Math.floor(availableCashBack * 100 * marketMultiplier);
        displayRate = `$1.00 = ${(100 * marketMultiplier).toFixed(0)} OP`;
      } 
      else if (card.currency_type === 'POINTS') {
        // Use the points balance and apply the market multiplier
        calculatedOpBalance = Math.floor((card.points_balance || 0) * marketMultiplier);
        displayRate = `1 Point = ${marketMultiplier.toFixed(2)} OP`;
      }

      // Return the card object with the newly calculated, randomized fields attached
      return {
        ...card,
        credit_token_balance: calculatedOpBalance,
        redemption_rate_display: displayRate,
      };
    });

    // 2. Upsert the randomized data into MongoDB
    for (const card of cardsWithDynamicRates) {
      const result = await FiatCard.findOneAndUpdate(
        { user_id: card.user_id, card_id: card.card_id },
        { $set: card },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`📄 Upserted → ${card.display_name} (Rate: ${card.redemption_rate_display})`);
    }

    console.log('✅ Seeding complete. Disconnecting…');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();