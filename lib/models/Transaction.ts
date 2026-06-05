// lib/models/Transaction.ts
import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
  {
    userId:      { type: String, required: true, index: true },
    cardId:      { type: String, required: true },        // which card was used
    type:        { type: String, enum: ['spend', 'earn', 'redemption', 'transfer'], required: true },

    // Real spend fields
    amountUsd:   { type: Number, required: true },        // actual USD amount spent
    category:    { type: String, required: true },        // 'grocery','travel','dining','electronics' etc
    merchant:    { type: String, default: '' },           // 'amazon.in', 'zomato', etc
    isEmi:       { type: Boolean, default: false },

    // Reward outcome
    pointsEarned:   { type: Number, default: 0 },
    rewardValueUsd: { type: Number, default: 0 },         // what those points were actually worth in USD

    // Redemption fields (type: 'redemption' only)
    pointsRedeemed:   { type: Number, default: 0 },   // points burned in this redemption
    valueReceivedUsd: { type: Number, default: 0 },   // USD value the user got back

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
TransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const Transaction =
  mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
