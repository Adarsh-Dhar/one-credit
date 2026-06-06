import mongoose from 'mongoose';

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
    profile: {
      homeAirport: String,
      topSpendCategories: [{ type: String, enum: ['dining', 'groceries', 'travel', 'gas', 'streaming', 'other'] }],
      cardsOwned: [String],
      carryBalance: { type: String, enum: ['yes', 'sometimes', 'never'] },
    },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
