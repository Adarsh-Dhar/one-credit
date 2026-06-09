// scripts/reset-monthly-balances.ts
//
// Script to reset monthly balances for all cards on the 1st of each month
// This should be run via cron job on the 1st of each month

import 'dotenv/config';
import { connectDB } from '../lib/mongodb.js';
import { FiatCard } from '../lib/models/FiatCard.js';

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function resetMonthlyBalances() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const currentMonth = getCurrentMonthKey();
    console.log(`Current month: ${currentMonth}`);

    // Get all cards that need to be reset
    const cardsToReset = await FiatCard.find({
      $or: [
        { last_reset_month: { $ne: currentMonth } },
        { last_reset_month: { $exists: false } },
        { last_reset_month: '' },
      ],
    });

    console.log(`Found ${cardsToReset.length} cards to reset`);

    let resetCount = 0;

    for (const card of cardsToReset) {
      const previousBalance = card.monthly_balance_owed || 0;

      await FiatCard.updateOne(
        { _id: card._id },
        {
          $set: {
            monthly_balance_owed: 0,
            last_reset_month: currentMonth,
          },
        }
      );

      console.log(`Reset ${card.display_name}: previous balance=$${previousBalance.toLocaleString()}`);
      resetCount++;
    }

    console.log(`Successfully reset ${resetCount} cards`);
    process.exit(0);
  } catch (error) {
    console.error('Error resetting monthly balances:', error);
    process.exit(1);
  }
}

resetMonthlyBalances();
