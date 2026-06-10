// lib/models/UserPreferences.ts
//
// Stores user-stated card preferences collected via the chatbot.
// These override or augment the RUM-inferred persona in rum-agent.ts.

import mongoose from 'mongoose';

export interface IPinnedCard {
  matchType: 'merchant' | 'category' | 'foreign';
  matchValue: string; // e.g. 'amazon', 'dining', 'foreign'
  cardId: string;
  cardDisplayName: string;
}

export interface IUserPreferences {
  userId: string;

  // ── Soft overrides → fed to rum-agent as extractedPrefs ──────────────────
  maxAnnualFeeUsd: number | null;
  preferCashback: boolean;
  preferMiles: boolean;
  preferFinancing: boolean;
  preferLoungeAccess: boolean;
  avoidNetworks: string[];
  carryBalance: 'yes' | 'sometimes' | 'never' | null;

  // ── Hard overrides → applied in /api/extension/analyze before op-agent ───
  pinnedCards: IPinnedCard[];
  excludedCardIds: string[];
  minSavingsThresholdUsd: number | null;

  // ── Meta ─────────────────────────────────────────────────────────────────
  chatSummary: string;          // plain-English summary of active prefs
  lastUpdatedViaChat: Date;
  updatedAt: Date;
}

const PinnedCardSchema = new mongoose.Schema<IPinnedCard>(
  {
    matchType:       { type: String, enum: ['merchant', 'category', 'foreign'], required: true },
    matchValue:      { type: String, required: true },
    cardId:          { type: String, required: true },
    cardDisplayName: { type: String, required: true },
  },
  { _id: false },
);

const UserPreferencesSchema = new mongoose.Schema<IUserPreferences>(
  {
    userId:                { type: String, required: true, unique: true, index: true },

    maxAnnualFeeUsd:       { type: Number, default: null },
    preferCashback:        { type: Boolean, default: false },
    preferMiles:           { type: Boolean, default: false },
    preferFinancing:       { type: Boolean, default: false },
    preferLoungeAccess:    { type: Boolean, default: false },
    avoidNetworks:         { type: [String], default: [] },
    carryBalance:          { type: String, enum: ['yes', 'sometimes', 'never', null], default: null },

    pinnedCards:           { type: [PinnedCardSchema], default: [] },
    excludedCardIds:       { type: [String], default: [] },
    minSavingsThresholdUsd:{ type: Number, default: null },

    chatSummary:           { type: String, default: '' },
    lastUpdatedViaChat:    { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const UserPreferences =
  mongoose.models.UserPreferences ||
  mongoose.model<IUserPreferences>('UserPreferences', UserPreferencesSchema);
