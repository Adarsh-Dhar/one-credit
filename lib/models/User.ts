import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    name: String,
    settings: {
      preferredCurrency: { type: String, default: 'USD' },
      notifications:     { type: Boolean, default: true },
    },
    portfolio: {
      cards: {
        skyward: {
          miles:  { type: Number, default: 60000 },
        },
        goldFork: {
          points: { type: Number, default: 30000 },
        },
        clearCash: {
          cash:   { type: Number, default: 150 },
        },
      },
      lastSyncTime: Date,
    },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
