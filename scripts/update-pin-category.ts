import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PinnedCardSchema = new mongoose.Schema({
  matchType: { type: String, enum: ['merchant', 'category', 'foreign'], required: true },
  matchValue: { type: String, required: true },
  cardId: { type: String, required: true },
  cardDisplayName: { type: String, required: true },
}, { _id: false });

const UserPreferencesSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  pinnedCards: { type: [PinnedCardSchema], default: [] },
}, { timestamps: true });

const UserPreferences = mongoose.models.UserPreferences || mongoose.model('UserPreferences', UserPreferencesSchema);

async function updatePinCategory() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);

    const userId = '6a1edff7fe936371ac8f10a8';

    const userPrefs = await UserPreferences.findOne({ userId });
    if (!userPrefs) {
      console.log('No user preferences found for user:', userId);
      return;
    }

    console.log('Current pinned cards:', userPrefs.pinnedCards);

    // Update the airlines pin to travel
    const updatedPinnedCards = userPrefs.pinnedCards.map(pin => {
      if (pin.matchType === 'category' && pin.matchValue === 'airlines') {
        return {
          ...pin,
          matchValue: 'travel'
        };
      }
      return pin;
    });

    userPrefs.pinnedCards = updatedPinnedCards;
    await userPrefs.save();

    console.log('Updated pinned cards:', userPrefs.pinnedCards);
    console.log('Pin updated successfully from "airlines" to "travel"');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error updating pin:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updatePinCategory();
