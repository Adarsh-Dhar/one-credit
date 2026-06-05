// lib/models/Transaction.ts
import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
  {
    userId:      { type: String, required: true, index: true },
    cardId:      { type: String, required: true },        // which card was used
    type:        { type: String, enum: ['spend', 'earn', 'transfer'], required: true },

    // Real spend fields
    amountInr:   { type: Number, required: true },        // actual INR amount spent
    category:    { type: String, required: true },        // 'grocery','travel','dining','electronics' etc
    merchant:    { type: String, default: '' },           // 'amazon.in', 'zomato', etc
    isEmi:       { type: Boolean, default: false },

    // Reward outcome
    pointsEarned:   { type: Number, default: 0 },
    rewardValueInr: { type: Number, default: 0 },         // what those points were actually worth

    // Keep old fields for backwards compat
    amountOp:    { type: Number, default: 0 },
    cardDebits:  { type: mongoose.Schema.Types.Mixed },
    description: String,
    metadata:    { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Index for behaviour analysis queries
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ userId: 1, category: 1 });
TransactionSchema.index({ userId: 1, cardId: 1 });

export const Transaction =
  mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
