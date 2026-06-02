// scripts/seed-fiat-cards.ts
//
// Inserts (or upserts) the two sample real-world cards into MongoDB.
//
// Run with:
//   npx ts-node --esm scripts/seed-fiat-cards.ts
// or (if you have tsx installed):
//   npx tsx scripts/seed-fiat-cards.ts
//
// Requires MONGODB_URI in .env (falls back to localhost).

import 'dotenv/config';
import mongoose from 'mongoose';
import { FiatCard } from '../models/FiatCard';

// ─── Connection helper (inline — no Next.js imports needed here) ──────────────

async function connect() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/omni-wallet';
  await mongoose.connect(uri);
  console.log('✅  Connected to MongoDB:', uri.replace(/:\/\/.*@/, '://***@'));
}

// ─── Card payloads ────────────────────────────────────────────────────────────

const USER_ID = 'usr_88374';          // matches the _id in your sample JSON

const cards = [
  // ── 1. Blue Cash Preferred (AMEX) ──────────────────────────────────────────
  {
    user_id:      USER_ID,
    card_id:      'card_amex_bcp_01',
    display_name: 'Blue Cash Preferred',
    card_type:    'personal' as const,
    network:      'AMEX',
    currency_type:'USD',

    current_balance_owed: 450.00,
    credit_limit:         10_000.00,

    financials: {
      annual_fee:                  95.00,
      foreign_transaction_fee_pct: 2.7,
      standard_apr:                24.99,
      promos: {
        intro_purchase_apr:            0.0,
        intro_purchase_apr_expiration: new Date('2026-12-01T00:00:00Z'),
        balance_transfer_fee_pct:      3.0,
        intro_bt_apr:                  0.0,
        intro_bt_apr_expiration:       new Date('2026-12-01T00:00:00Z'),
      },
    },

    rewards_structure: {
      base_multiplier: 1.0,
      fixed_categories: [
        {
          category:                  'groceries',
          multiplier:                6.0,
          cap_amount_usd:            6_000.00,
          cap_period:                'annual',
          current_spend_towards_cap: 4_500.00,
          post_cap_multiplier:       1.0,
        },
        {
          category:      'streaming',
          multiplier:    6.0,
          cap_amount_usd: null,     // unlimited
        },
      ],
      rotating_categories: {
        is_active:         false,
        current_quarter:   null,
        active_categories: [],
        multiplier:        null,
      },
    },

    benefits_and_credits: {
      statement_credits: [
        {
          name:            'Disney Bundle Credit',
          amount_usd:      84.00,
          reset_period:    'annual',
          amount_redeemed: 42.00,
        },
      ],
      airline_perks:  [],
      general_perks:  ['return_protection', 'extended_warranty'],
    },
  },

  // ── 2. Ink Business Preferred (Chase / VISA) ────────────────────────────────
  {
    user_id:      USER_ID,
    card_id:      'card_chase_ink_02',
    display_name: 'Ink Business Preferred',
    card_type:    'business' as const,
    network:      'VISA',
    currency_type:'POINTS',

    points_balance: 80_000,

    financials: {
      annual_fee:                  95.00,
      foreign_transaction_fee_pct: 0.0,
      standard_apr:                21.24,
      promos: null,
    },

    rewards_structure: {
      base_multiplier: 1.0,
      fixed_categories: [
        {
          category:                  'travel',
          multiplier:                3.0,
          cap_amount_usd:            150_000.00,
          cap_period:                'anniversary_year',
          current_spend_towards_cap: 12_000.00,
          post_cap_multiplier:       1.0,
        },
        {
          category:                  'shipping_advertising',
          multiplier:                3.0,
          cap_amount_usd:            150_000.00,
          cap_period:                'anniversary_year',
          current_spend_towards_cap: 45_000.00,
          post_cap_multiplier:       1.0,
        },
      ],
      rotating_categories: {
        is_active: false,
      },
    },

    benefits_and_credits: {
      statement_credits: [],
      airline_perks:     [],
      general_perks:     ['cell_phone_protection', 'primary_rental_car_coverage'],
    },
  },
];

// ─── Upsert and exit ──────────────────────────────────────────────────────────

async function seed() {
  await connect();

  for (const card of cards) {
    const result = await FiatCard.findOneAndUpdate(
      { user_id: card.user_id, card_id: card.card_id },   // match key
      { $set: card },                                       // full replace of fields
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  📄 Upserted → ${result.display_name}  (_id: ${result._id})`);
  }

  console.log('\n✅  Seeding complete. Disconnecting…');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});