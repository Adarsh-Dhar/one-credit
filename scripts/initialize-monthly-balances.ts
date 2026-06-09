// scripts/initialize-monthly-balances.ts
//
// Initialize monthly balance fields for existing cards
// Sets monthly_balance_owed to current current_balance_owed and last_reset_month to current month

import 'dotenv/config';
import { connectDB } from '../lib/mongodb.js';
import { FiatCard } from '../lib/models/FiatCard.js';

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function initializeMonthlyBalances() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const currentMonth = getCurrentMonthKey();
    console.log(`Current month: ${currentMonth}`);

    // Get all cards that don't have monthly_balance_owed set
    const cardsToInitialize = await FiatCard.find({
      $or: [
        { monthly_balance_owed: { $exists: false } },
        { monthly_balance_owed: null },
      ],
    });

    console.log(`Found ${cardsToInitialize.length} cards to initialize`);

    let initializedCount = 0;

    for (const card of cardsToInitialize) {
      const currentBalance = card.current_balance_owed || 0;

      await FiatCard.updateOne(
        { _id: card._id },
        {
          $set: {
            monthly_balance_owed: currentBalance,
            last_reset_month: currentMonth,
          },
        }
      );

      console.log(`Initialized ${card.display_name}: monthly_balance_owed=$${currentBalance.toLocaleString()}`);
      initializedCount++;
    }

    console.log(`Successfully initialized ${initializedCount} cards`);
    process.exit(0);
  } catch (error) {
    console.error('Error initializing monthly balances:', error);
    process.exit(1);
  }
}

initializeMonthlyBalances();
