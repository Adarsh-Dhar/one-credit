// scripts/populate-card-balances.ts
//
// Migration script to populate random credit_limit and current_balance_owed for all cards
// This overwrites existing values with random data

import 'dotenv/config';
import { connectDB } from '../lib/mongodb.js';
import { FiatCard } from '../lib/models/FiatCard.js';

function getRandomCreditLimit(): number {
  // Generate rounded credit limits: 10k, 15k, 20k, 25k, 30k, 35k, 40k, 45k, 50k
  const limits = [10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000];
  return limits[Math.floor(Math.random() * limits.length)];
}

function getRandomBalanceOwed(creditLimit: number): number {
  // Random balance between 0% and 30% of credit limit
  const maxPercentage = 0.3;
  const maxBalance = creditLimit * maxPercentage;
  return Math.floor(Math.random() * maxBalance);
}

async function populateCardBalances() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Get all cards
    const cards = await FiatCard.find({});
    console.log(`Found ${cards.length} cards to update`);

    let updatedCount = 0;

    for (const card of cards) {
      const creditLimit = getRandomCreditLimit();
      const balanceOwed = getRandomBalanceOwed(creditLimit);

      await FiatCard.updateOne(
        { _id: card._id },
        {
          credit_limit: creditLimit,
          current_balance_owed: balanceOwed,
        }
      );

      console.log(`Updated ${card.display_name}: limit=$${creditLimit.toLocaleString()}, owed=$${balanceOwed.toLocaleString()}`);
      updatedCount++;
    }

    console.log(`Successfully updated ${updatedCount} cards`);
    process.exit(0);
  } catch (error) {
    console.error('Error populating card balances:', error);
    process.exit(1);
  }
}

populateCardBalances();
