// scripts/create-demo-user.ts
// Creates a new demo user and seeds cards for them

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDB } from '../lib/mongodb'
import { User } from '../lib/models/User'
import { FiatCard } from '../lib/models/FiatCard'
import logger from '../lib/logger'

// Generate random email and password
const randomString = Math.random().toString(36).substring(2, 8)
const email = `demo-${randomString}@onecredit.test`
const password = 'Demo123!@#'
const name = 'Demo User'

enum CardType {
  PERSONAL = 'personal',
  BUSINESS = 'business',
}

enum Network {
  AMEX = 'AMEX',
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  DISCOVER = 'DISCOVER',
}

enum CurrencyType {
  USD = 'USD',
  POINTS = 'POINTS',
  MILES = 'MILES',
}

function buildCards(userId: string) {
  return [
    {
      user_id: userId,
      card_id: 'card_chase_sapphire_reserve_01',
      display_name: 'Chase Sapphire Reserve',
      card_type: 'personal' as CardType,
      network: 'VISA' as Network,
      currency_type: 'POINTS' as CurrencyType,
      current_balance_owed: 0,
      credit_limit: 30000,
      points_balance: 52000,
      credit_token_balance: 0,
      redemption_rate_display: '1 Point = 1.5 cents (Chase Travel)',
      points_value_cents: 150,
      points_program_name: 'Chase Ultimate Rewards',
      card_description: 'The definitive premium travel card. $300 travel credit nearly halves the $550 annual fee.',
      pros: ['$300 annual travel credit offsets fee significantly', 'Priority Pass Select — unlimited lounge visits + 2 guests'],
      cons: ['$550 annual fee (highest in its tier)', 'Authorized user fee of $75 per person'],
      features: ['3x on travel and dining worldwide', '10x on hotels/cars via Chase Travel', '$300 annual travel credit'],
      financials: { annual_fee: 550, foreign_transaction_fee_pct: 0, standard_apr: 0.2174 },
      rewards_structure: {
        base_multiplier: 1,
        fixed_categories: [
          { category: 'travel', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
          { category: 'flights', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
          { category: 'hotel', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
          { category: 'dining', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        ],
      },
      benefits_and_credits: {
        statement_credits: [
          { name: 'Annual Travel Credit', amount_usd: 300, reset_period: 'calendar_year', amount_redeemed: 0, merchant_categories: ['travel', 'flights', 'hotel'] },
        ],
        portal_bonuses: [],
        purchase_protections: { extended_warranty: true, purchase_protection_days: 120, return_protection_days: 90, cell_phone_protection: true, trip_cancellation: true, primary_rental_cdw: true },
        transfer_partners: [
          { program: 'United MileagePlus', ratio: '1:1', cpp_min: 1.20, cpp_max: 2.10 },
          { program: 'Southwest Rapid Rewards', ratio: '1:1', cpp_min: 1.40, cpp_max: 1.70 },
        ],
        airline_perks: ['Priority Pass Select — unlimited visits + 2 guests'],
        general_perks: ['No foreign transaction fees'],
      },
    },
    {
      user_id: userId,
      card_id: 'card_amex_platinum_01',
      display_name: 'Amex Platinum',
      card_type: 'personal' as CardType,
      network: 'AMEX' as Network,
      currency_type: 'POINTS' as CurrencyType,
      current_balance_owed: 0,
      credit_limit: 25000,
      points_balance: 75000,
      credit_token_balance: 0,
      redemption_rate_display: '1 MR Point = 1.0–2.0 cents',
      points_value_cents: 150,
      points_program_name: 'Amex Membership Rewards',
      card_description: 'The pinnacle of lifestyle credit cards. $695 annual fee offset by $1,400+ in annual credits.',
      pros: ['Centurion Lounge access (best food/drink in airport lounges)', '$200 annual airline fee credit'],
      cons: ['$695 annual fee — highest in mainstream market', 'Credits require active management to redeem'],
      features: ['5x Membership Rewards on flights booked directly with airlines', 'Centurion Lounge + Priority Pass access'],
      financials: { annual_fee: 695, foreign_transaction_fee_pct: 0, standard_apr: 0.0 },
      rewards_structure: {
        base_multiplier: 1,
        fixed_categories: [
          { category: 'flights', multiplier: 5, cap_amount_usd: 500000, cap_period: 'calendar_year', current_spend_towards_cap: 0, post_cap_multiplier: 1 },
          { category: 'hotel', multiplier: 5, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1 },
        ],
      },
      benefits_and_credits: {
        statement_credits: [
          { name: 'Uber Cash', amount_usd: 200, reset_period: 'calendar_year', amount_redeemed: 0, merchant_categories: ['rideshare', 'uber eats'] },
          { name: 'Airline Fee Credit', amount_usd: 200, reset_period: 'calendar_year', amount_redeemed: 0, merchant_categories: ['flights', 'airline'] },
        ],
        portal_bonuses: [],
        purchase_protections: { extended_warranty: true, purchase_protection_days: 90, return_protection_days: 90, cell_phone_protection: false, trip_cancellation: true, primary_rental_cdw: false },
        transfer_partners: [
          { program: 'Delta SkyMiles', ratio: '1:1', cpp_min: 1.10, cpp_max: 1.80 },
          { program: 'British Airways Avios', ratio: '1:1', cpp_min: 1.40, cpp_max: 2.40 },
        ],
        airline_perks: ['Centurion Lounge access worldwide'],
        general_perks: ['No foreign transaction fees'],
      },
    },
    {
      user_id: userId,
      card_id: 'card_chase_freedom_unlimited_01',
      display_name: 'Chase Freedom Unlimited',
      card_type: 'personal' as CardType,
      network: 'VISA' as Network,
      currency_type: 'POINTS' as CurrencyType,
      current_balance_owed: 0,
      credit_limit: 12000,
      points_balance: 18000,
      credit_token_balance: 0,
      redemption_rate_display: '1 Point = 1.0–1.5 cents',
      points_value_cents: 100,
      points_program_name: 'Chase Ultimate Rewards',
      card_description: 'The ideal no-annual-fee companion card. 1.5% base on everything with bonus categories.',
      pros: ['No annual fee', '1.5% base cashback on all purchases (above industry 1%)'],
      cons: ['3% foreign transaction fee', 'Requires a premium Chase card to unlock best redemptions'],
      features: ['1.5% unlimited cashback on all purchases', '3% cashback on dining and drugstore purchases'],
      financials: { annual_fee: 0, foreign_transaction_fee_pct: 3, standard_apr: 0.1999 },
      rewards_structure: {
        base_multiplier: 1.5,
        fixed_categories: [
          { category: 'dining', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1.5 },
          { category: 'drug', multiplier: 3, cap_amount_usd: null, cap_period: null, current_spend_towards_cap: 0, post_cap_multiplier: 1.5 },
        ],
      },
      benefits_and_credits: {
        statement_credits: [],
        portal_bonuses: [],
        purchase_protections: { extended_warranty: true, purchase_protection_days: 120, return_protection_days: 0, cell_phone_protection: false, trip_cancellation: false, primary_rental_cdw: false },
        transfer_partners: [],
        airline_perks: [],
        general_perks: ['No annual fee'],
      },
    },
  ]
}

async function main() {
  await connectDB()

  logger.info('Creating new user...')
  logger.info(`Email: ${email}`)
  logger.info(`Password: ${password}`)

  // Check if user exists
  const existing = await User.findOne({ email })
  if (existing) {
    logger.info('User already exists, deleting...')
    await User.deleteOne({ email })
    await FiatCard.deleteMany({ user_id: existing._id.toString() })
  }

  // Create user
  const hashed = await bcrypt.hash(password, 12)
  const user = await User.create({
    email,
    name,
    password: hashed,
    portfolio: { cards: {} }
  })

  logger.info(`User created: ${user._id.toString()}`)

  // Seed cards
  logger.info('Seeding cards...')
  const userId = user._id.toString()
  const cards = buildCards(userId)

  await FiatCard.deleteMany({ user_id: userId })
  await FiatCard.insertMany(cards)

  logger.info(`Seeded ${cards.length} cards for user`)

  logger.info('=== DEMO CREDENTIALS ===')
  logger.info(`Email: ${email}`)
  logger.info(`Password: ${password}`)
  logger.info('========================')

  await mongoose.disconnect()
}

main().catch(logger.error)
