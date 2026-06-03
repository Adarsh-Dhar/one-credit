// scripts/seed-cards.ts
//
// Seed script for fiat cards with comprehensive rewards data
// Includes statement credits, portal bonuses, purchase protections, and transfer partners

import mongoose from 'mongoose';
import { connectDB } from '../lib/mongodb';
import { FiatCard } from '../lib/models/FiatCard';

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
    card_image_url: null,
    card_description: 'The American Express Platinum Card is a premium travel card with extensive perks including airport lounge access, travel credits, and flexible point transfers to multiple airline and hotel partners.',
    pros: [
      'Excellent travel perks with lounge access',
      'Flexible point transfers to multiple partners',
      'Generous travel credits offset annual fee',
      'No foreign transaction fees',
      'Premium travel insurance benefits'
    ],
    cons: [
      'High annual fee of $695',
      'Requires high spending to maximize value',
      'Limited acceptance at some merchants'
    ],
    features: [
      '5x points on flights booked with Amex Travel',
      '5x points on prepaid hotels booked with Amex Travel',
      '4x points on restaurants worldwide',
      'Airport lounge access with Priority Pass',
      '$200 airline fee credit per year',
      '$200 Uber Cash credit per year',
      '$100 Saks Fifth Avenue credit per year',
      '$100 Equinox credit per year',
      'Global Entry/TSA PreCheck credit',
      'No foreign transaction fees'
    ],
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
        { program: 'Delta SkyMiles', ratio: '1:1', cpp_min: 1.20, cpp_max: 1.80 },
        { program: 'British Airways', ratio: '1:1', cpp_min: 1.40, cpp_max: 2.00 },
        { program: 'Marriott Bonvoy', ratio: '1:1', cpp_min: 0.80, cpp_max: 1.20 },
        { program: 'Hilton Honors', ratio: '1:1', cpp_min: 0.60, cpp_max: 1.00 },
        { program: 'Air France/Flying Blue', ratio: '1:1', cpp_min: 1.40, cpp_max: 1.80 },
        { program: 'Virgin Atlantic', ratio: '1:1', cpp_min: 1.40, cpp_max: 1.80 },
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
    card_image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/American_Express_Gold_Card.jpg/320px-American_Express_Gold_Card.jpg',
    card_description: 'The American Express Gold Card is an excellent dining and grocery rewards card with 4x points on U.S. supermarkets and restaurants, plus flexible point transfers to multiple travel partners.',
    pros: [
      '4x points on U.S. supermarkets (up to $25,000 per year)',
      '4x points on restaurants worldwide',
      '3x points on flights booked directly with airlines',
      'Flexible point transfers to multiple partners',
      'Dining and Uber credits offset annual fee'
    ],
    cons: [
      'Annual fee of $250',
      'Grocery bonus capped at $25,000 per year',
      'No lounge access compared to Platinum'
    ],
    features: [
      '4x points on U.S. supermarkets (up to $25,000 per year)',
      '4x points on restaurants worldwide',
      '3x points on flights booked directly with airlines',
      '1x points on all other purchases',
      'Points transfer to 18+ airline and hotel partners',
      '$120 dining credit per year',
      '$120 Uber Cash credit per year',
      'No foreign transaction fees',
      'Purchase protection'
    ],
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
        { program: 'Delta SkyMiles', ratio: '1:1', cpp_min: 1.20, cpp_max: 1.80 },
        { program: 'British Airways', ratio: '1:1', cpp_min: 1.40, cpp_max: 2.00 },
        { program: 'Air France/Flying Blue', ratio: '1:1', cpp_min: 1.40, cpp_max: 1.80 },
        { program: 'Virgin Atlantic', ratio: '1:1', cpp_min: 1.40, cpp_max: 1.80 },
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
    card_image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Chase_Sapphire_Preferred_Card.jpg/320px-Chase_Sapphire_Preferred_Card.jpg',
    card_description: 'The Chase Sapphire Preferred is a mid-tier travel rewards card with a generous sign-up bonus, flexible point transfers, and excellent travel protections at a reasonable annual fee.',
    pros: [
      'Generous sign-up bonus worth significant value',
      'Flexible point transfers to multiple travel partners',
      'Reasonable annual fee for the benefits offered',
      'Excellent travel purchase protections',
      'No foreign transaction fees'
    ],
    cons: [
      'Lower earn rate on non-bonus categories',
      'No lounge access compared to premium cards',
      'Points transfer to some partners at less than 1:1 ratio'
    ],
    features: [
      '3x points on dining',
      '3x points on online grocery purchases (excluding Target, Walmart, wholesale clubs)',
      '2x points on travel',
      '1x points on all other purchases',
      'Points transfer to 14+ airline and hotel partners',
      'Travel protections including trip delay insurance',
      'No foreign transaction fees',
      'Primary rental car insurance'
    ],
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
        { portal_name: 'Chase Travel', portal_url: 'https://travel.chase.com', categories: ['travel', 'flights', 'hotel'], bonus_multiplier: 5, bonus_type: 'multiplier' },
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
        { program: 'United MileagePlus', ratio: '1:1', cpp_min: 1.40, cpp_max: 2.00 },
        { program: 'Southwest Rapid Rewards', ratio: '1:1', cpp_min: 1.50, cpp_max: 1.70 },
        { program: 'British Airways', ratio: '1:1', cpp_min: 1.40, cpp_max: 2.00 },
        { program: 'World of Hyatt', ratio: '1:1', cpp_min: 1.50, cpp_max: 2.10 },
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
    card_image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Chase_Sapphire_Reserve_Card.jpg/320px-Chase_Sapphire_Reserve_Card.jpg',
    card_description: 'The Chase Sapphire Reserve is a premium travel card with extensive perks including Priority Pass lounge access, substantial travel credits, and excellent point transfer options for frequent travelers.',
    pros: [
      'Priority Pass lounge access with unlimited visits',
      '$300 annual travel credit',
      '$60 Lyft credit and $60 DoorDash credit',
      'Excellent point transfer partners',
      'Premium travel insurance protections'
    ],
    cons: [
      'High annual fee of $550',
      'Requires significant spending to maximize value',
      'Metal card can be heavy in wallet'
    ],
    features: [
      '3x points on dining',
      '3x points on travel',
      '3x points on flights booked directly with airlines',
      '3x points on hotels booked directly with hotels',
      '1x points on all other purchases',
      'Points transfer to 14+ airline and hotel partners',
      'Priority Pass Select lounge access',
      '$300 annual travel credit',
      '$60 Lyft credit per year',
      '$60 DoorDash credit per year',
      'Global Entry/TSA PreCheck credit',
      'No foreign transaction fees',
      'Primary rental car insurance'
    ],
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
        { portal_name: 'Chase Travel', portal_url: 'https://travel.chase.com', categories: ['travel', 'flights', 'hotel'], bonus_multiplier: 10, bonus_type: 'multiplier' },
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
        { program: 'United MileagePlus', ratio: '1:1', cpp_min: 1.40, cpp_max: 2.00 },
        { program: 'Southwest Rapid Rewards', ratio: '1:1', cpp_min: 1.50, cpp_max: 1.70 },
        { program: 'British Airways', ratio: '1:1', cpp_min: 1.40, cpp_max: 2.00 },
        { program: 'Marriott Bonvoy', ratio: '1:1', cpp_min: 0.80, cpp_max: 1.20 },
        { program: 'World of Hyatt', ratio: '1:1', cpp_min: 1.50, cpp_max: 2.10 },
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
    card_image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Chase_Freedom_Unlimited_Card.jpg/320px-Chase_Freedom_Unlimited_Card.jpg',
    card_description: 'The Chase Freedom Unlimited offers a flat 1.5% cash back on all purchases with no annual fee, making it an excellent everyday spending card that pairs well with other Chase Ultimate Rewards cards.',
    pros: [
      'No annual fee',
      '1.5% cash back on all purchases',
      'Pairs well with premium Chase cards for bonus categories',
      'No rotating categories to track',
      'Purchase protections included'
    ],
    cons: [
      'Foreign transaction fee of 3%',
      'No bonus categories for higher earning',
      'Requires pairing with premium cards to maximize value'
    ],
    features: [
      '1.5% cash back on all purchases',
      '3% cash back on drugstore purchases (up to $6,000 per year)',
      'No annual fee',
      'Purchase protections',
      'Extended warranty',
      'Pairs with Chase Sapphire cards for bonus travel redemptions'
    ],
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
    card_image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Chase_Ink_Business_Preferred_Card.jpg/320px-Chase_Ink_Business_Preferred_Card.jpg',
    card_description: 'The Ink Business Preferred is a premium business rewards card with 3x points on travel, shipping, and advertising, plus flexible point transfers to multiple travel partners.',
    pros: [
      '3x points on travel, shipping, and advertising',
      'Flexible point transfers to multiple partners',
      'Generous sign-up bonus worth significant value',
      'Purchase protections included',
      'No foreign transaction fees'
    ],
    cons: [
      'Annual fee of $95',
      'Foreign transaction fee of 3%',
      'Requires business to qualify'
    ],
    features: [
      '3x points on shipping purchases',
      '3x points on advertising purchases',
      '3x points on travel (flights, hotels)',
      '1x points on all other purchases',
      'Points transfer to 14+ airline and hotel partners',
      'Purchase protections',
      'Extended warranty',
      'No foreign transaction fees',
      'Employee cards at no cost'
    ],
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
        { program: 'United MileagePlus', ratio: '1:1', cpp_min: 1.40, cpp_max: 2.00 },
        { program: 'Southwest Rapid Rewards', ratio: '1:1', cpp_min: 1.50, cpp_max: 1.70 },
        { program: 'British Airways', ratio: '1:1', cpp_min: 1.40, cpp_max: 2.00 },
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
    card_image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Wells_Fargo_Active_Cash_Card.jpg/320px-Wells_Fargo_Active_Cash_Card.jpg',
    card_description: 'The Wells Fargo Active Cash Card offers a flat 2% cash back on all purchases with no annual fee, making it an excellent everyday spending card with cell phone protection.',
    pros: [
      '2% cash back on all purchases',
      'No annual fee',
      'Cell phone protection included',
      'No rotating categories to track',
      'Simple rewards structure'
    ],
    cons: [
      'Foreign transaction fee of 3%',
      'No sign-up bonus',
      'No additional perks or benefits'
    ],
    features: [
      '2% cash back on all purchases',
      'No annual fee',
      'Cell phone protection (up to $600, $25 deductible)',
      'Purchase protection',
      'Extended warranty'
    ],
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
    card_image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Capital_One_Venture_X_Card.jpg/320px-Capital_One_Venture_X_Card.jpg',
    card_description: 'The Capital One Venture X is a premium travel rewards card with excellent earn rates on travel, substantial travel credits, and Priority Pass lounge access for frequent travelers.',
    pros: [
      '2x miles on all purchases (5x on travel)',
      '$300 annual travel credit',
      'Priority Pass lounge access',
      'No foreign transaction fees',
      'Flexible mile redemption options'
    ],
    cons: [
      'High annual fee of $395',
      'Requires travel spending to maximize value',
      'Limited transfer partners compared to Chase'
    ],
    features: [
      '2x miles on all purchases',
      '5x miles on flights, hotels, and rental cars booked through Capital One Travel',
      'Miles transfer to 15+ airline and hotel partners',
      'Priority Pass lounge access',
      '$300 annual travel credit',
      'Up to $100 credit for Global Entry or TSA PreCheck',
      'No foreign transaction fees',
      'Travel protections including trip delay insurance',
      'Cell phone protection',
      'Extended warranty'
    ],
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
        { program: 'Delta SkyMiles', ratio: '1:1', cpp_min: 1.20, cpp_max: 1.80 },
        { program: 'British Airways', ratio: '1:1', cpp_min: 1.40, cpp_max: 2.00 },
        { program: 'Turkish Airlines', ratio: '1:1', cpp_min: 1.30, cpp_max: 1.70 },
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
    card_image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Citi_Double_Cash_Card.jpg/320px-Citi_Double_Cash_Card.jpg',
    card_description: 'The Citi Double Cash Card offers a simple and effective 2% cash back on all purchases - 1% when you buy and 1% when you pay, with no annual fee.',
    pros: [
      'Simple 2% cash back on all purchases',
      'No annual fee',
      'No categories to track or activate',
      'Unlimited cash back earnings'
    ],
    cons: [
      'Foreign transaction fee of 3%',
      'No sign-up bonus',
      'No additional perks or benefits'
    ],
    features: [
      '2% cash back on all purchases (1% when you buy, 1% when you pay)',
      'No annual fee',
      'No foreign transaction fees',
      'Unlimited cash back earnings',
      'Cash back can be redeemed for statement credits, checks, or direct deposit'
    ],
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
    card_image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Discover_it_Card.jpg/320px-Discover_it_Card.jpg',
    card_description: 'The Discover it Card offers 5% cash back on rotating categories each quarter and 1% on all other purchases, with no annual fee and a Cashback Match in the first year.',
    pros: [
      '5% cash back on rotating categories',
      'Cashback Match doubles first-year rewards',
      'No annual fee',
      'No foreign transaction fees',
      'Free FICO credit score'
    ],
    cons: [
      'Rotating categories require activation',
      'Categories may not match your spending',
      'Lower base earn rate of 1%'
    ],
    features: [
      '5% cash back on rotating quarterly categories (up to $1,500 per quarter)',
      '1% cash back on all other purchases',
      'Cashback Match in first year (doubles all rewards)',
      'No annual fee',
      'No foreign transaction fees',
      'Free FICO credit score',
      'Purchase protection',
      'Return protection'
    ],
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
    card_image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hilton_Honors_Surpass_Card.jpg/320px-Hilton_Honors_Surpass_Card.jpg',
    card_description: 'The Hilton Honors Surpass Card offers excellent Hilton hotel rewards with 12x points on Hilton purchases, free night awards, and automatic Gold status for frequent travelers.',
    pros: [
      '12x points on Hilton purchases',
      'Free night award each card anniversary',
      'Automatic Hilton Gold status',
      'Priority Pass lounge access',
      'No foreign transaction fees'
    ],
    cons: [
      'Annual fee of $95',
      'Points only valuable for Hilton stays',
      'Limited transfer options'
    ],
    features: [
      '12x points on Hilton purchases',
      '7x points on flights, hotels, restaurants, groceries, gas',
      '3x points on all other purchases',
      'Free night award each anniversary',
      'Automatic Hilton Gold status',
      'Priority Pass lounge access',
      '$250 Hilton resort credit per year',
      'No foreign transaction fees'
    ],
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
    card_image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Marriott_Bonvoy_Boundless_Card.jpg/320px-Marriott_Bonvoy_Boundless_Card.jpg',
    card_description: 'The Marriott Bonvoy Boundless Card offers excellent Marriott hotel rewards with 6x points on travel, free night awards, and automatic Silver status for frequent travelers.',
    pros: [
      '6x points on Marriott purchases',
      'Free night award each card anniversary',
      'Automatic Marriott Silver status',
      'No foreign transaction fees',
      'Good value for Marriott loyalists'
    ],
    cons: [
      'Annual fee of $95',
      'Points only valuable for Marriott stays',
      'Limited transfer options'
    ],
    features: [
      '6x points on Marriott purchases',
      '4x points on restaurants and groceries',
      '2x points on all other purchases',
      'Free night award each anniversary',
      'Automatic Marriott Silver status',
      'No foreign transaction fees',
      'Purchase protection'
    ],
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

async function seed() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Delete existing cards for this user
    await FiatCard.deleteMany({ user_id: USER_ID });
    console.log('Deleted existing cards for user:', USER_ID);

    // Insert new cards
    await FiatCard.insertMany(cards);
    console.log(`Seeded ${cards.length} cards for user:`, USER_ID);

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding cards:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

seed();
