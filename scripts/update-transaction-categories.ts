import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const TransactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  cardId: { type: String, required: true },
  type: { type: String, required: true },
  amountUsd: { type: Number, required: true },
  category: { type: String, required: true },
  merchant: { type: String, default: '' },
  isEmi: { type: Boolean, default: false },
  pointsEarned: { type: Number, default: 0 },
  rewardValueUsd: { type: Number, default: 0 },
}, { timestamps: true });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

async function updateTransactionCategories() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);

    const userId = '6a1edff7fe936371ac8f10a8';

    // Update all transactions with category "other" and amount $74 (flight bookings) to "travel"
    const result = await Transaction.updateMany(
      { userId, type: 'spend', category: 'other', amountUsd: 74 },
      { $set: { category: 'travel' } }
    );

    console.log(`Updated ${result.modifiedCount} transactions from "other" to "travel"`);

    // Verify the update
    const transactions = await Transaction.find({ userId, type: 'spend' }).sort({ createdAt: -1 }).limit(10);

    console.log('\nUpdated transaction details:');
    transactions.forEach(tx => {
      console.log(`- Category: ${tx.category}, Amount: $${tx.amountUsd}, Date: ${tx.createdAt}`);
    });

    // Aggregate by category
    const categoryAggregation = await Transaction.aggregate([
      { $match: { userId, type: 'spend' } },
      { $group: { _id: '$category', count: { $sum: 1 }, totalAmount: { $sum: '$amountUsd' } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\nUpdated category breakdown:');
    categoryAggregation.forEach(cat => {
      console.log(`- ${cat._id}: ${cat.count} transactions, $${cat.totalAmount.toFixed(2)}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error updating transactions:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updateTransactionCategories();
