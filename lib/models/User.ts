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
      homeAirportName: String,
      topSpendCategories: [{ type: String, enum: ['dining', 'groceries', 'travel', 'airlines', 'gas', 'streaming', 'shopping', 'luxury', 'electronics', 'apparel', 'jewelry', 'home', 'health', 'fitness', 'education', 'entertainment', 'transportation', 'utilities', 'insurance', 'professional_services', 'other'] }],
      carryBalance: { type: String, enum: ['yes', 'sometimes', 'never'] },
    },
    geminiApiKey: String,
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
