import mongoose from 'mongoose';
import { CARDS } from '@/lib/cards';

// Build the cards sub-schema dynamically from CARDS constant
// so adding a new card in cards.ts automatically adds it to the schema
const cardsSchema: Record<string, unknown> = {};
for (const card of CARDS) {
  cardsSchema[card.key] = {
    balance: { type: Number, default: card.defaultBalance },
  };
}

const UserSchema = new mongoose.Schema(
  {
    email:  { type: String, required: true, unique: true },
    name:   String,
    password: { type: String, select: false },
    settings: {
      preferredCurrency: { type: String, default: 'USD' },
      notifications:     { type: Boolean, default: true },
    },
    portfolio: {
      cards:        { type: mongoose.Schema.Types.Mixed, default: {} },
      lastSyncTime: Date,
    },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
