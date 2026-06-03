// app/api/fiat-cards/seed/route.ts
//
// Dev-only endpoint to seed cards into MongoDB
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FiatCard } from '@/lib/models/FiatCard';

const USER_ID = 'usr_88374';

const cards = [
  {
    user_id: USER_ID,
    card_id: 'card_amex_platinum_01',
    display_name: 'Amex Platinum',
    card_type: 'personal' as const,
    network: 'AMEX',
    currency_type: 'POINTS',
    current_balance_owed: 0,
    credit_limit: 25000,
    points_balance: 45000,
    credit_token_balance: 0,
    redemption_rate_display: '1 Point = 1.0-2.0 cents',
    points_value_cents: 150,
    points_program_name: 'Membership Rewards',
    financials: {
      annual_fee: 695,
      foreign_transaction_fee_pct: 0,
      standard_apr: 0.1599,
    },
    rewards_structure: {
      base_multiplier: 1,
      fixed_categories: [
        { category: 'flights', multiplier: 5, cap_amount_usd: 500000, cap_period: 'calendar_year', current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'hotel', multiplier: 5, cap_amount_usd: 500000, cap_period: 'calendar_year', current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'dining', multiplier: 4, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
      ],
    },
    benefits_and_credits: {
      statement_credits: [
        { name: 'Saks Fifth Avenue', amount_usd: 100, reset_period: 'calendar_year', amount_redeemed: 0, merchant_categories: ['shopping', 'fashion'] },
        { name: 'Equinox', amount_usd: 300, reset_period: 'calendar_year', amount_redeemed: 0, merchant_categories: ['fitness', 'gym'] },
        { name: 'Uber Cash', amount_usd: 200, reset_period: 'calendar_year', amount_redeemed: 0, merchant_categories: ['travel', 'rideshare'] },
        { name: 'Digital Entertainment', amount_usd: 20, reset_period: 'monthly', amount_redeemed: 0, merchant_categories: ['streaming', 'entertainment'] },
      ],
      portal_bonuses: [
        { portal_name: 'Amex Travel', portal_url: 'https://travel.americanexpress.com', categories: ['travel', 'flights', 'hotel'], bonus_multiplier: 1.5, bonus_type: 'multiplier' },
      ],
      purchase_protections: {
        extended_warranty: true,
        purchase_protection_days: 90,
        return_protection_days: 90,
        cell_phone_protection: true,
        trip_cancellation: true,
        primary_rental_cdw: true,
      },
      transfer_partners: [
        { program: 'Delta SkyMiles', ratio: '1:1', cpp_min: 120, cpp_max: 180 },
        { program: 'British Airways', ratio: '1:1', cpp_min: 140, cpp_max: 200 },
        { program: 'Marriott Bonvoy', ratio: '1:1', cpp_min: 80, cpp_max: 120 },
        { program: 'Hilton Honors', ratio: '1:1', cpp_min: 60, cpp_max: 100 },
      ],
      airline_perks: ['Priority Pass lounges', 'Global Entry credit', 'TSA PreCheck credit'],
      general_perks: ['Concierge service', 'No foreign transaction fees'],
    },
  },
  {
    user_id: USER_ID,
    card_id: 'card_amex_gold_01',
    display_name: 'Amex Gold',
    card_type: 'personal' as const,
    network: 'AMEX',
    currency_type: 'POINTS',
    current_balance_owed: 0,
    credit_limit: 20000,
    points_balance: 32000,
    credit_token_balance: 0,
    redemption_rate_display: '1 Point = 1.0-2.0 cents',
    points_value_cents: 120,
    points_program_name: 'Membership Rewards',
    financials: {
      annual_fee: 250,
      foreign_transaction_fee_pct: 0,
      standard_apr: 0.1874,
    },
    rewards_structure: {
      base_multiplier: 1,
      fixed_categories: [
        { category: 'grocer', multiplier: 4, cap_amount_usd: 25000, cap_period: 'calendar_year', current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'dining', multiplier: 4, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'flights', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
      ],
    },
    benefits_and_credits: {
      statement_credits: [
        { name: 'Dining', amount_usd: 120, reset_period: 'calendar_year', amount_redeemed: 0, merchant_categories: ['dining', 'restaurant'] },
        { name: 'Uber Cash', amount_usd: 120, reset_period: 'calendar_year', amount_redeemed: 0, merchant_categories: ['travel', 'rideshare'] },
      ],
      portal_bonuses: [
        { portal_name: 'Amex Travel', portal_url: 'https://travel.americanexpress.com', categories: ['travel', 'flights', 'hotel'], bonus_multiplier: 1.3, bonus_type: 'multiplier' },
      ],
      purchase_protections: {
        extended_warranty: false,
        purchase_protection_days: 90,
        return_protection_days: 0,
        cell_phone_protection: false,
        trip_cancellation: false,
        primary_rental_cdw: false,
      },
      transfer_partners: [
        { program: 'Delta SkyMiles', ratio: '1:1', cpp_min: 120, cpp_max: 180 },
        { program: 'British Airways', ratio: '1:1', cpp_min: 140, cpp_max: 200 },
      ],
      airline_perks: ['No foreign transaction fees'],
      general_perks: ['Uber credits', 'Dining credits'],
    },
  },
  {
    user_id: USER_ID,
    card_id: 'card_chase_sapphire_preferred_01',
    display_name: 'Chase Sapphire Preferred',
    card_type: 'personal' as const,
    network: 'VISA',
    currency_type: 'POINTS',
    current_balance_owed: 0,
    credit_limit: 15000,
    points_balance: 28000,
    credit_token_balance: 0,
    redemption_rate_display: '1 Point = 1.25 cents',
    points_value_cents: 125,
    points_program_name: 'Ultimate Rewards',
    financials: {
      annual_fee: 95,
      foreign_transaction_fee_pct: 0,
      standard_apr: 0.2074,
    },
    rewards_structure: {
      base_multiplier: 1,
      fixed_categories: [
        { category: 'dining', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'travel', multiplier: 2, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'flights', multiplier: 2, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'hotel', multiplier: 2, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
      ],
    },
    benefits_and_credits: {
      statement_credits: [],
      portal_bonuses: [
        { portal_name: 'Chase Travel', portal_url: 'https://travel.chase.com', categories: ['travel', 'flights', 'hotel'], bonus_multiplier: 1.25, bonus_type: 'multiplier' },
      ],
      purchase_protections: {
        extended_warranty: true,
        purchase_protection_days: 120,
        return_protection_days: 90,
        cell_phone_protection: false,
        trip_cancellation: false,
        primary_rental_cdw: false,
      },
      transfer_partners: [
        { program: 'United MileagePlus', ratio: '1:1', cpp_min: 140, cpp_max: 200 },
        { program: 'Southwest Rapid Rewards', ratio: '1:1', cpp_min: 150, cpp_max: 170 },
        { program: 'British Airways', ratio: '1:1', cpp_min: 140, cpp_max: 200 },
      ],
      airline_perks: ['No foreign transaction fees', 'Travel insurance'],
      general_perks: ['Primary rental car insurance'],
    },
  },
  {
    user_id: USER_ID,
    card_id: 'card_chase_sapphire_reserve_01',
    display_name: 'Chase Sapphire Reserve',
    card_type: 'personal' as const,
    network: 'VISA',
    currency_type: 'POINTS',
    current_balance_owed: 0,
    credit_limit: 30000,
    points_balance: 52000,
    credit_token_balance: 0,
    redemption_rate_display: '1 Point = 1.5 cents',
    points_value_cents: 150,
    points_program_name: 'Ultimate Rewards',
    financials: {
      annual_fee: 550,
      foreign_transaction_fee_pct: 0,
      standard_apr: 0.2174,
    },
    rewards_structure: {
      base_multiplier: 1,
      fixed_categories: [
        { category: 'dining', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'travel', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'flights', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'hotel', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
      ],
    },
    benefits_and_credits: {
      statement_credits: [
        { name: 'Travel Credit', amount_usd: 300, reset_period: 'calendar_year', amount_redeemed: 0, merchant_categories: ['travel', 'flights', 'hotel'] },
        { name: 'Lyft Credit', amount_usd: 60, reset_period: 'calendar_year', amount_redeemed: 0, merchant_categories: ['travel', 'rideshare'] },
        { name: 'DoorDash Credit', amount_usd: 60, reset_period: 'calendar_year', amount_redeemed: 0, merchant_categories: ['dining', 'restaurant'] },
      ],
      portal_bonuses: [
        { portal_name: 'Chase Travel', portal_url: 'https://travel.chase.com', categories: ['travel', 'flights', 'hotel'], bonus_multiplier: 1.5, bonus_type: 'multiplier' },
      ],
      purchase_protections: {
        extended_warranty: true,
        purchase_protection_days: 120,
        return_protection_days: 90,
        cell_phone_protection: true,
        trip_cancellation: true,
        primary_rental_cdw: true,
      },
      transfer_partners: [
        { program: 'United MileagePlus', ratio: '1:1', cpp_min: 140, cpp_max: 200 },
        { program: 'Southwest Rapid Rewards', ratio: '1:1', cpp_min: 150, cpp_max: 170 },
        { program: 'British Airways', ratio: '1:1', cpp_min: 140, cpp_max: 200 },
        { program: 'Marriott Bonvoy', ratio: '1:1', cpp_min: 80, cpp_max: 120 },
      ],
      airline_perks: ['Priority Pass Select', 'Global Entry credit', 'TSA PreCheck credit'],
      general_perks: ['No foreign transaction fees', 'Concierge service'],
    },
  },
  {
    user_id: USER_ID,
    card_id: 'card_chase_freedom_unlimited_01',
    display_name: 'Chase Freedom Unlimited',
    card_type: 'personal' as const,
    network: 'VISA',
    currency_type: 'POINTS',
    current_balance_owed: 0,
    credit_limit: 12000,
    points_balance: 18000,
    credit_token_balance: 0,
    redemption_rate_display: '1 Point = 1.0-1.5 cents',
    points_value_cents: 100,
    points_program_name: 'Ultimate Rewards',
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 0.1824,
    },
    rewards_structure: {
      base_multiplier: 1.5,
      fixed_categories: [
        { category: 'drug', multiplier: 3, cap_amount_usd: 6000, cap_period: 'calendar_year', current_spend_towards_cap: 0, post_cap_multiplier: 1.5 },
        { category: 'pharmacy', multiplier: 3, cap_amount_usd: 6000, cap_period: 'calendar_year', current_spend_towards_cap: 0, post_cap_multiplier: 1.5 },
      ],
    },
    benefits_and_credits: {
      statement_credits: [],
      portal_bonuses: [],
      purchase_protections: {
        extended_warranty: false,
        purchase_protection_days: 120,
        return_protection_days: 90,
        cell_phone_protection: false,
        trip_cancellation: false,
        primary_rental_cdw: false,
      },
      transfer_partners: [],
      airline_perks: [],
      general_perks: ['No annual fee'],
    },
  },
  {
    user_id: USER_ID,
    card_id: 'card_ink_preferred_01',
    display_name: 'Ink Business Preferred',
    card_type: 'business' as const,
    network: 'VISA',
    currency_type: 'POINTS',
    current_balance_owed: 0,
    credit_limit: 25000,
    points_balance: 38000,
    credit_token_balance: 0,
    redemption_rate_display: '1 Point = 1.25 cents',
    points_value_cents: 125,
    points_program_name: 'Ultimate Rewards',
    financials: {
      annual_fee: 95,
      foreign_transaction_fee_pct: 3,
      standard_apr: 0.1974,
    },
    rewards_structure: {
      base_multiplier: 1,
      fixed_categories: [
        { category: 'shipping', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'advertising', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'travel', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'flights', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'hotel', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
      ],
    },
    benefits_and_credits: {
      statement_credits: [],
      portal_bonuses: [
        { portal_name: 'Chase Travel', portal_url: 'https://travel.chase.com', categories: ['travel', 'flights', 'hotel'], bonus_multiplier: 1.25, bonus_type: 'multiplier' },
      ],
      purchase_protections: {
        extended_warranty: true,
        purchase_protection_days: 120,
        return_protection_days: 90,
        cell_phone_protection: false,
        trip_cancellation: false,
        primary_rental_cdw: false,
      },
      transfer_partners: [
        { program: 'United MileagePlus', ratio: '1:1', cpp_min: 140, cpp_max: 200 },
        { program: 'Southwest Rapid Rewards', ratio: '1:1', cpp_min: 150, cpp_max: 170 },
        { program: 'British Airways', ratio: '1:1', cpp_min: 140, cpp_max: 200 },
      ],
      airline_perks: ['No foreign transaction fees'],
      general_perks: ['Employee cards at no cost'],
    },
  },
  {
    user_id: USER_ID,
    card_id: 'card_wells_fargo_active_cash_01',
    display_name: 'Wells Fargo Active Cash',
    card_type: 'personal' as const,
    network: 'VISA',
    currency_type: 'USD',
    current_balance_owed: 0,
    credit_limit: 10000,
    points_balance: 0,
    credit_token_balance: 25000,
    redemption_rate_display: '$1.00 = 100 OP',
    points_value_cents: 100,
    points_program_name: null,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 0.1824,
    },
    rewards_structure: {
      base_multiplier: 2,
      fixed_categories: [],
    },
    benefits_and_credits: {
      statement_credits: [],
      portal_bonuses: [],
      purchase_protections: {
        extended_warranty: false,
        purchase_protection_days: 90,
        return_protection_days: 0,
        cell_phone_protection: false,
        trip_cancellation: false,
        primary_rental_cdw: false,
      },
      transfer_partners: [],
      airline_perks: [],
      general_perks: ['No annual fee', '2% flat cash back'],
    },
  },
  {
    user_id: USER_ID,
    card_id: 'card_capital_one_venture_x_01',
    display_name: 'Capital One Venture X',
    card_type: 'personal' as const,
    network: 'VISA',
    currency_type: 'MILES',
    current_balance_owed: 0,
    credit_limit: 30000,
    points_balance: 42000,
    credit_token_balance: 0,
    redemption_rate_display: '1 Mile = 1.0-1.5 cents',
    points_value_cents: 125,
    points_program_name: 'Venture Rewards',
    financials: {
      annual_fee: 395,
      foreign_transaction_fee_pct: 0,
      standard_apr: 0.1974,
    },
    rewards_structure: {
      base_multiplier: 2,
      fixed_categories: [
        { category: 'travel', multiplier: 5, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'flights', multiplier: 5, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'hotel', multiplier: 5, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'rental car', multiplier: 5, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
      ],
    },
    benefits_and_credits: {
      statement_credits: [
        { name: 'Travel Credit', amount_usd: 300, reset_period: 'calendar_year', amount_redeemed: 0, merchant_categories: ['travel', 'flights', 'hotel'] },
      ],
      portal_bonuses: [
        { portal_name: 'Capital One Travel', portal_url: 'https://travel.capitalone.com', categories: ['travel', 'flights', 'hotel'], bonus_multiplier: 1.5, bonus_type: 'multiplier' },
      ],
      purchase_protections: {
        extended_warranty: true,
        purchase_protection_days: 90,
        return_protection_days: 90,
        cell_phone_protection: true,
        trip_cancellation: true,
        primary_rental_cdw: true,
      },
      transfer_partners: [
        { program: 'Delta SkyMiles', ratio: '2:1.5', cpp_min: 120, cpp_max: 180 },
        { program: 'British Airways', ratio: '2:1.5', cpp_min: 140, cpp_max: 200 },
      ],
      airline_perks: ['Priority Pass lounges', 'Global Entry credit', 'TSA PreCheck credit'],
      general_perks: ['No foreign transaction fees', 'Concierge service'],
    },
  },
  {
    user_id: USER_ID,
    card_id: 'card_citi_double_cash_01',
    display_name: 'Citi Double Cash',
    card_type: 'personal' as const,
    network: 'MASTERCARD',
    currency_type: 'USD',
    current_balance_owed: 0,
    credit_limit: 8000,
    points_balance: 0,
    credit_token_balance: 18000,
    redemption_rate_display: '$1.00 = 100 OP',
    points_value_cents: 100,
    points_program_name: null,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 0.1824,
    },
    rewards_structure: {
      base_multiplier: 2,
      fixed_categories: [],
    },
    benefits_and_credits: {
      statement_credits: [],
      portal_bonuses: [],
      purchase_protections: {
        extended_warranty: false,
        purchase_protection_days: 90,
        return_protection_days: 0,
        cell_phone_protection: false,
        trip_cancellation: false,
        primary_rental_cdw: false,
      },
      transfer_partners: [],
      airline_perks: [],
      general_perks: ['No annual fee', '2% flat cash back'],
    },
  },
  {
    user_id: USER_ID,
    card_id: 'card_discover_it_01',
    display_name: 'Discover it',
    card_type: 'personal' as const,
    network: 'DISCOVER',
    currency_type: 'USD',
    current_balance_owed: 0,
    credit_limit: 7000,
    points_balance: 0,
    credit_token_balance: 15000,
    redemption_rate_display: '$1.00 = 100 OP',
    points_value_cents: 100,
    points_program_name: null,
    financials: {
      annual_fee: 0,
      foreign_transaction_fee_pct: 3,
      standard_apr: 0.1724,
    },
    rewards_structure: {
      base_multiplier: 1,
      fixed_categories: [
        { category: 'grocer', multiplier: 5, cap_amount_usd: null, cap_period: 'quarter', current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'gas', multiplier: 5, cap_amount_usd: null, cap_period: 'quarter', current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'restaurant', multiplier: 5, cap_amount_usd: null, cap_period: 'quarter', current_spend_towards_cap: 0, post_cap_multiplier: 1 },
      ],
      rotating_categories: {
        is_active: true,
        current_quarter: 'Q1 2025',
        active_categories: ['grocer', 'gas', 'restaurant'],
        multiplier: 5,
      },
    },
    benefits_and_credits: {
      statement_credits: [],
      portal_bonuses: [],
      purchase_protections: {
        extended_warranty: false,
        purchase_protection_days: 90,
        return_protection_days: 90,
        cell_phone_protection: false,
        trip_cancellation: false,
        primary_rental_cdw: false,
      },
      transfer_partners: [],
      airline_perks: [],
      general_perks: ['No annual fee', 'Cashback Match first year'],
    },
  },
  {
    user_id: USER_ID,
    card_id: 'card_hilton_surpass_01',
    display_name: 'Hilton Honors Surpass',
    card_type: 'personal' as const,
    network: 'AMEX',
    currency_type: 'POINTS',
    current_balance_owed: 0,
    credit_limit: 15000,
    points_balance: 35000,
    credit_token_balance: 0,
    redemption_rate_display: '1 Point = 0.5-0.6 cents',
    points_value_cents: 55,
    points_program_name: 'Hilton Honors',
    financials: {
      annual_fee: 95,
      foreign_transaction_fee_pct: 0,
      standard_apr: 0.1874,
    },
    rewards_structure: {
      base_multiplier: 3,
      fixed_categories: [
        { category: 'flights', multiplier: 7, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'hotel', multiplier: 12, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'restaurant', multiplier: 7, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'grocer', multiplier: 7, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'gas', multiplier: 7, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
      ],
    },
    benefits_and_credits: {
      statement_credits: [
        { name: 'Hilton Resort Credit', amount_usd: 250, reset_period: 'calendar_year', amount_redeemed: 0, merchant_categories: ['hotel', 'travel'] },
      ],
      portal_bonuses: [],
      purchase_protections: {
        extended_warranty: false,
        purchase_protection_days: 90,
        return_protection_days: 0,
        cell_phone_protection: false,
        trip_cancellation: false,
        primary_rental_cdw: false,
      },
      transfer_partners: [],
      airline_perks: ['Free night award', 'Priority Pass lounges'],
      general_perks: ['No foreign transaction fees', 'Gold status'],
    },
  },
  {
    user_id: USER_ID,
    card_id: 'card_marriott_boundless_01',
    display_name: 'Marriott Bonvoy Boundless',
    card_type: 'personal' as const,
    network: 'VISA',
    currency_type: 'POINTS',
    current_balance_owed: 0,
    credit_limit: 15000,
    points_balance: 30000,
    credit_token_balance: 0,
    redemption_rate_display: '1 Point = 0.8-1.2 cents',
    points_value_cents: 90,
    points_program_name: 'Marriott Bonvoy',
    financials: {
      annual_fee: 95,
      foreign_transaction_fee_pct: 0,
      standard_apr: 0.1974,
    },
    rewards_structure: {
      base_multiplier: 2,
      fixed_categories: [
        { category: 'travel', multiplier: 6, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'flights', multiplier: 6, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'hotel', multiplier: 6, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'restaurant', multiplier: 4, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        { category: 'grocer', multiplier: 4, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
      ],
    },
    benefits_and_credits: {
      statement_credits: [
        { name: 'Free Night Credit', amount_usd: 85, reset_period: 'anniversary_year', amount_redeemed: 0, merchant_categories: ['hotel', 'travel'] },
      ],
      portal_bonuses: [],
      purchase_protections: {
        extended_warranty: false,
        purchase_protection_days: 90,
        return_protection_days: 0,
        cell_phone_protection: false,
        trip_cancellation: false,
        primary_rental_cdw: false,
      },
      transfer_partners: [],
      airline_perks: ['Free night award', 'Silver status'],
      general_perks: ['No foreign transaction fees'],
    },
  },
];

export async function POST(request: Request) {
  // Guard: only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seed endpoint is not available in production' }, { status: 403 });
  }

  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Delete existing cards for this user
    await FiatCard.deleteMany({ user_id: USER_ID });
    console.log('Deleted existing cards for user:', USER_ID);

    // Insert new cards
    await FiatCard.insertMany(cards);
    console.log(`Seeded ${cards.length} cards for user:`, USER_ID);

    return NextResponse.json({ 
      success: true, 
      message: `Seeded ${cards.length} cards for user ${USER_ID}` 
    });
  } catch (error) {
    console.error('Error seeding cards:', error);
    return NextResponse.json({ error: 'Failed to seed cards' }, { status: 500 });
  }
}
