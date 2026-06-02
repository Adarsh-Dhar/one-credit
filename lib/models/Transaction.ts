// lib/models/Transaction.ts  (new file)
import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['spend', 'earn', 'transfer'],
      required: true,
    },
    amountOp: {
      type: Number,
      required: true,
    },
    cardDebits: {
      skyward:   { type: { miles: Number } },
      goldFork:  { type: { points: Number } },
      clearCash: { type: { cash: Number } },
    },
    description: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
