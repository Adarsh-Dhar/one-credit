// lib/models/UserIntent.ts
//
// User intent extraction from chat conversations.
// Stores chat history and extracted preferences that override RUM-inferred personas.

import mongoose from 'mongoose';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedPrefs {
  maxAnnualFee?: number;
  spendGoal?: string;
  mustHaveFeatures: string[];
  avoidNetworks: string[];
  budgetAmount?: number;
  rawStatement: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const UserIntentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    messages: {
      type: [
        {
          role: { type: String, enum: ['user', 'assistant'], required: true },
          content: { type: String, required: true },
          timestamp: { type: Date, required: true },
        },
      ],
      default: [],
    },
    extractedPrefs: {
      maxAnnualFee: { type: Number },
      spendGoal: { type: String },
      mustHaveFeatures: { type: [String], default: [] },
      avoidNetworks: { type: [String], default: [] },
      budgetAmount: { type: Number },
      rawStatement: { type: String, default: '' },
    },
    activeOverride: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Model Export ─────────────────────────────────────────────────────────────

export const UserIntent = mongoose.models.UserIntent || mongoose.model('UserIntent', UserIntentSchema);
