import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../lib/mongodb'
import { FiatCard } from '../lib/models/FiatCard'

async function addOpRedemption() {
  try {
    await connectDB()
    
    const result = await FiatCard.updateOne(
      { card_id: 'card_amex_blue_cash_everyday_01' },
      {
        $set: {
          op_redemption: {
            op_cents_per_token: 1.0,
            min_redeem_tokens: 2500,
            redeem_categories: ['cashback', 'travel', 'merchandise'],
            token_velocity: 1.0,
            appreciation_model: 'fixed',
          }
        }
      }
    )
    
    console.log(`Updated ${result.modifiedCount} card(s)`)
    
    const card = await FiatCard.findOne({ card_id: 'card_amex_blue_cash_everyday_01' })
    console.log('Card op_redemption:', card?.op_redemption)
    
    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

addOpRedemption()
