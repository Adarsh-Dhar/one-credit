// scripts/reset-all-spending.ts
//
// Resets all spending data to zero - clears card balances, transactions, and spend tracking
// This is useful for starting fresh with no spending history

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { FiatCard } from '../lib/models/FiatCard';
import { Transaction } from '../lib/models/Transaction';

// Load environment variables
dotenv.config();

async function resetAllSpending() {
  try {
    // Connect to MongoDB directly
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Delete all transactions
    const transactionDeleteResult = await Transaction.deleteMany({});
    console.log(`Deleted ${transactionDeleteResult.deletedCount} transactions`);

    // Reset all card balances
    const cardUpdateResult = await FiatCard.updateMany(
      {},
      {
        $set: {
          current_balance_owed: 0,
          monthly_balance_owed: 0,
          points_balance: 0,
          credit_token_balance: 0,
        },
      }
    );
    console.log(`Reset balances for ${cardUpdateResult.modifiedCount} cards`);

    // Reset fixed categories spend tracking using array filter
    const cards = await FiatCard.find({});
    for (const card of cards) {
      if (card.rewards_structure.fixed_categories && card.rewards_structure.fixed_categories.length > 0) {
        card.rewards_structure.fixed_categories.forEach(cat => {
          cat.current_spend_towards_cap = 0;
        });
        await card.save();
      }
    }
    console.log(`Reset spend tracking for ${cards.length} cards`);

    console.log('✓ All spending data has been reset to zero');
  } catch (error) {
    console.error('Error resetting spending data:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the reset
resetAllSpending();
