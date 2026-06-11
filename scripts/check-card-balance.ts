import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const FiatCardSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  card_id: { type: String, required: true },
  currency_type: { type: String, required: true },
  points_balance: { type: Number, default: 0 },
  credit_token_balance: { type: Number, default: 0 },
  points_value_cents: { type: Number, default: 1.0 },
  current_balance_owed: { type: Number, default: 0 },
  monthly_balance_owed: { type: Number, default: 0 },
  credit_limit: { type: Number },
}, { timestamps: true });

const FiatCard = mongoose.models.FiatCard || mongoose.model('FiatCard', FiatCardSchema);

async function checkCardBalance() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);

    const userId = '6a1edff7fe936371ac8f10a8';
    const cardId = 'card_capital_one_venture_x_01';

    const card = await FiatCard.findOne({ user_id: userId, card_id: cardId });
    if (!card) {
      console.log('No card found for user:', userId, 'card:', cardId);
      return;
    }

    console.log('Card details:');
    console.log('- Card ID:', card.card_id);
    console.log('- Currency Type:', card.currency_type);
    console.log('- Points Balance:', card.points_balance);
    console.log('- Credit Token Balance:', card.credit_token_balance);
    console.log('- Points Value Cents:', card.points_value_cents);
    console.log('- Current Balance Owed:', card.current_balance_owed);
    console.log('- Monthly Balance Owed:', card.monthly_balance_owed);
    console.log('- Credit Limit:', card.credit_limit);

    // Calculate rewards value
    const pointsValue = card.points_balance * (card.points_value_cents / 100);
    console.log('\nCalculated Rewards Value: $' + pointsValue.toFixed(2));

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error checking card balance:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkCardBalance();
