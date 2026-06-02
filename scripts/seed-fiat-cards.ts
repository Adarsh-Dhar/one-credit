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
        intro_purchase_apr_expiration: new Date('2025-12-31'),
        balance_transfer_fee_pct: 5,
        intro_bt_apr: 0,
        intro_bt_apr_expiration: new Date('2025-12-31'),
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
      ],
      general_perks: ['Purchase protection', 'Extended warranty', 'Cell phone protection'],
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
