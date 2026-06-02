// scripts/seed-fiat-cards.ts
//
// Seed script to insert sample fiat credit cards into MongoDB.
// Uses upsert so running it multiple times is safe.

import 'dotenv/config';
import mongoose from 'mongoose';
import { FiatCard } from '../lib/models/FiatCard';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/omni-wallet';

// Sample fiat cards data
const sampleCards = [
  {
    user_id: 'usr_88374',
    card_id: 'card_amex_bcp_01',
    display_name: 'Blue Cash Preferred',
    card_type: 'personal',
    network: 'AMEX',
    currency_type: 'USD',
    current_balance_owed: 0,
    credit_limit: 10000,
    financials: {
      annual_fee: 95,
      foreign_transaction_fee_pct: 2.7,
      standard_apr: 17.24,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: new Date('2025-12-31'),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: new Date('2025-12-31'),
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
      ],
      rotating_categories: {
        is_active: false,
      },
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
  {
    user_id: 'usr_88374',
    card_id: 'card_chase_ink_01',
    display_name: 'Ink Business Preferred',
    card_type: 'business',
    network: 'VISA',
    currency_type: 'POINTS',
    points_balance: 0,
    financials: {
      annual_fee: 95,
      foreign_transaction_fee_pct: 0,
      standard_apr: 19.24,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_duration: '12 months',
        intro_purchase_apr_expiration: new Date('2025-12-31'),
        balance_transfer_fee_pct: 5,
        intro_bt_apr: 0,
        intro_bt_apr_duration: '12 months',
        intro_bt_apr_expiration: new Date('2025-12-31'),
        welcome_bonus: {
          points: 100000,
          spend_requirement_usd: 8000,
          time_period_days: 90,
        },
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
          category: 'Advertising purchases with social media sites and search engines',
          multiplier: 3.0,
          cap_amount_usd: null,
          cap_period: null,
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
      ],
      rotating_categories: {
        is_active: false,
      },
    },
    benefits_and_credits: {
      statement_credits: [
        {
          name: 'Global Entry/TSA PreCheck application fee credit',
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
  {
    user_id: 'usr_88374',
    card_id: 'card_chase_sapphire_01',
    display_name: 'Chase Sapphire Preferred',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'POINTS',
    points_balance: 0,
    financials: {
      annual_fee: 95,
      foreign_transaction_fee_pct: 0,
      standard_apr: 20.49,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_duration: '12 months',
        intro_purchase_apr_expiration: new Date('2025-12-31'),
        balance_transfer_fee_pct: 5,
        intro_bt_apr: 0,
        intro_bt_apr_duration: '12 months',
        intro_bt_apr_expiration: new Date('2025-12-31'),
        welcome_bonus: {
          points: 60000,
          spend_requirement_usd: 4000,
          time_period_days: 90,
        },
      },
    },
    rewards_structure: {
      base_multiplier: 1.0,
      fixed_categories: [
        {
          category: 'Travel',
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
      rotating_categories: {
        is_active: false,
      },
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
      general_perks: ['Purchase protection', 'Extended warranty', 'Travel protection', 'No foreign transaction fees'],
    },
  },
  {
    user_id: 'usr_88374',
    card_id: 'card_chase_ink_unlimited_01',
    display_name: 'Ink Business Unlimited',
    card_type: 'business',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 0,
    credit_limit: 25000,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 16.49,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: new Date('2025-12-31'),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: new Date('2025-12-31'),
      },
    },
    rewards_structure: {
      base_multiplier: 1.5,
      fixed_categories: [],
      rotating_categories: {
        is_active: false,
      },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: ['Purchase protection', 'Extended warranty'],
    },
  },
  {
    user_id: 'usr_88374',
    card_id: 'card_discover_student_chrome_01',
    display_name: 'Discover it Student Chrome',
    card_type: 'personal',
    network: 'DISCOVER',
    currency_type: 'USD',
    current_balance_owed: 0,
    credit_limit: 1500,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 0,
      standard_apr: 17.49,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: new Date('2025-12-31'),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: new Date('2025-12-31'),
      },
    },
    rewards_structure: {
      base_multiplier: 1.0,
      fixed_categories: [
        {
          category: 'Gas stations',
          multiplier: 2.0,
          cap_amount_usd: 1000,
          cap_period: 'quarterly',
          cap_note: 'Combined cap with restaurants ($1,000 total per quarter)',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Restaurants',
          multiplier: 2.0,
          cap_amount_usd: 1000,
          cap_period: 'quarterly',
          cap_note: 'Combined cap with gas stations ($1,000 total per quarter)',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
      ],
      rotating_categories: {
        is_active: false,
      },
      special_rules: {
        cashback_match: 'Discover matches all cash back earned at end of first year',
        referral_bonus: 'Statement credit for referring friends who get approved',
      },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: ['No foreign transaction fees', 'Free FICO score', 'Cashback match at end of first year', 'Pay until midnight on due date', 'Referral bonuses'],
    },
  },
  {
    user_id: 'usr_88374',
    card_id: 'card_capital_one_quicksilver_student_01',
    display_name: 'Capital One Quicksilver Student Cash Rewards',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 0,
    credit_limit: 1500,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 0,
      standard_apr: 19.99,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_duration: '15 months',
        intro_purchase_apr_expiration: new Date('2025-12-31'),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_duration: '15 months',
        intro_bt_apr_expiration: new Date('2025-12-31'),
      },
    },
    rewards_structure: {
      base_multiplier: 1.5,
      fixed_categories: [],
      rotating_categories: {
        is_active: false,
      },
      special_rules: {
        referral_bonus: 'Earn up to $500 per year by referring friends and family',
      },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: ['No annual fee', 'No foreign transaction fees', 'Flat 1.5% cash back on all purchases', 'Rewards never expire', 'Referral bonuses'],
    },
  },
  {
    user_id: 'usr_88374',
    card_id: 'card_bofa_student_unlimited_01',
    display_name: 'Bank of America Unlimited Cash Rewards for Students',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 0,
    credit_limit: 2000,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 18.24,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: new Date('2025-12-31'),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: new Date('2025-12-31'),
        welcome_bonus: {
          amount_usd: 200,
          spend_requirement_usd: 1000,
          time_period_days: 90,
        },
      },
    },
    rewards_structure: {
      base_multiplier: 1.5,
      first_year_bonus_multiplier: 0.5, // Additional 0.5% in first year = 2% total
      fixed_categories: [],
      rotating_categories: {
        is_active: false,
      },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: ['No annual fee', 'Cash rewards never expire', 'Preferred Rewards bonus (25%-75% more for Bank of America customers)', 'No caps or categories on rewards'],
    },
  },
  {
    user_id: 'usr_88374',
    card_id: 'card_amex_everyday_01',
    display_name: 'Blue Cash Everyday',
    card_type: 'personal',
    network: 'AMEX',
    currency_type: 'USD',
    current_balance_owed: 0,
    credit_limit: 5000,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 2.7,
      standard_apr: 17.24,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_duration: '15 months',
        intro_purchase_apr_expiration: new Date('2025-12-31'),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_duration: '15 months',
        intro_bt_apr_expiration: new Date('2025-12-31'),
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
      rotating_categories: {
        is_active: false,
      },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: ['Purchase protection', 'Extended warranty', 'Return protection', 'No annual fee'],
    },
  },
  {
    user_id: 'usr_88374',
    card_id: 'card_wells_active_cash_01',
    display_name: 'Wells Fargo Active Cash',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 0,
    credit_limit: 7500,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 17.49,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_duration: '15 months',
        intro_purchase_apr_expiration: new Date('2025-12-31'),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_duration: '15 months',
        intro_bt_apr_expiration: new Date('2025-12-31'),
        welcome_bonus: {
          amount_usd: 200,
          spend_requirement_usd: 500,
          time_period_days: 90,
        },
      },
    },
    rewards_structure: {
      base_multiplier: 2.0,
      fixed_categories: [],
      rotating_categories: {
        is_active: false,
      },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: ['Cell phone protection (up to $600 with $25 deductible)', 'Purchase protection', 'Extended warranty', 'No annual fee', 'Unlimited 2% cash back'],
    },
  },
  {
    user_id: 'usr_88374',
    card_id: 'card_bofa_customized_cash_student_01',
    display_name: 'Bank of America Customized Cash Rewards for Students',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 0,
    credit_limit: 3000,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 17.49,
      recommended_credit_score: '690-850',
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_duration: '15 billing cycles',
        intro_purchase_apr_expiration: new Date('2025-12-31'),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_duration: '60 days from account opening',
        intro_bt_apr_expiration: new Date('2025-12-31'),
        welcome_bonus: {
          amount_usd: 200,
          spend_requirement_usd: 1000,
          time_period_days: 90,
        },
      },
    },
    rewards_structure: {
      base_multiplier: 1.0,
      fixed_categories: [
        {
          category: 'Choice category (online shopping, gas, dining, travel, drug stores, home improvement)',
          multiplier: 3.0,
          first_year_multiplier: 6.0, // 6% in first year
          cap_amount_usd: 2500,
          cap_period: 'quarterly',
          cap_note: 'Combined cap with groceries and wholesale clubs ($2,500 total per quarter)',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Grocery stores',
          multiplier: 2.0,
          cap_amount_usd: 2500,
          cap_period: 'quarterly',
          cap_note: 'Combined cap with choice category and wholesale clubs ($2,500 total per quarter)',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Wholesale clubs',
          multiplier: 2.0,
          cap_amount_usd: 2500,
          cap_period: 'quarterly',
          cap_note: 'Combined cap with choice category and groceries ($2,500 total per quarter)',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
      ],
      rotating_categories: {
        is_active: false,
      },
      special_rules: {
        choice_category_change_frequency: 'once per calendar month',
        preferred_rewards_bonus: '25%-75% more cash back for Bank of America customers',
        first_year_bonus: '6% cash back in choice category for first year (vs 3% after)',
      },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: ['No annual fee', 'Preferred Rewards bonus (25%-75% more)', 'Cash rewards never expire', 'Change choice category monthly', 'Select card design option', 'Build credit history'],
    },
  },
  {
    user_id: 'usr_88374',
    card_id: 'card_bofa_customized_cash_01',
    display_name: 'Bank of America Customized Cash Rewards',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 0,
    credit_limit: 5000,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 17.49,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_expiration: new Date('2025-12-31'),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: new Date('2025-12-31'),
        welcome_bonus: {
          amount_usd: 200,
          spend_requirement_usd: 1000,
          time_period_days: 90,
        },
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
          cap_note: 'Combined cap with groceries and wholesale clubs',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Groceries',
          multiplier: 2.0,
          cap_amount_usd: 2500,
          cap_period: 'quarterly',
          cap_note: 'Combined cap with choice category and wholesale clubs',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
        {
          category: 'Wholesale clubs',
          multiplier: 2.0,
          cap_amount_usd: 2500,
          cap_period: 'quarterly',
          cap_note: 'Combined cap with choice category and groceries',
          current_spend_towards_cap: 0,
          post_cap_multiplier: 1.0,
        },
      ],
      rotating_categories: {
        is_active: false,
      },
      special_rules: {
        choice_category_change_frequency: 'once per calendar month',
        preferred_rewards_bonus: '25%-75% more cash back for Bank of America customers',
      },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: ['No annual fee', 'Preferred Rewards bonus (25%-75% more)', 'Cash rewards never expire', 'Change choice category monthly'],
    },
  },
  {
    user_id: 'usr_88374',
    card_id: 'card_wells_reflect_01',
    display_name: 'Wells Fargo Reflect',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 0,
    credit_limit: 10000,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 17.49,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_duration: '21 months from account opening',
        intro_purchase_apr_expiration: new Date('2027-12-31'),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_duration: '21 months from account opening',
        intro_bt_apr_expiration: new Date('2027-12-31'),
      },
    },
    rewards_structure: {
      base_multiplier: 1.0,
      fixed_categories: [],
      rotating_categories: {
        is_active: false,
      },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: ['Cell phone protection', 'Purchase protection', 'Extended warranty', 'No annual fee', 'Long 0% intro APR period'],
    },
  },
  {
    user_id: 'usr_88374',
    card_id: 'card_chase_freedom_unlimited_01',
    display_name: 'Chase Freedom Unlimited',
    card_type: 'personal',
    network: 'VISA',
    currency_type: 'POINTS',
    points_balance: 0,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 19.99,
      promos: {
        intro_purchase_apr: 0,
        intro_purchase_apr_duration: '15 months',
        intro_purchase_apr_expiration: new Date('2025-12-31'),
        balance_transfer_fee_pct: 3,
        intro_bt_apr: 0,
        intro_bt_apr_duration: '15 months',
        intro_bt_apr_expiration: new Date('2025-12-31'),
        welcome_bonus: {
          amount_usd: 200,
          spend_requirement_usd: 500,
          time_period_days: 90,
        },
      },
    },
    rewards_structure: {
      base_multiplier: 1.5,
      fixed_categories: [
        {
          category: 'Travel',
          multiplier: 5.0,
          cap_amount_usd: 1500,
          cap_period: 'quarterly',
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
      rotating_categories: {
        is_active: false,
      },
    },
    benefits_and_credits: {
      statement_credits: [],
      airline_perks: [],
      general_perks: ['No annual fee', 'Purchase protection', 'Extended warranty', 'Cell phone protection'],
    },
  },
];

async function seed() {
  try {
    console.log('🔌 Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    for (const card of sampleCards) {
      const result = await FiatCard.findOneAndUpdate(
        { user_id: card.user_id, card_id: card.card_id },
        { $set: card },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`📄 Upserted → ${card.display_name} (_id: ${result._id})`);
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
