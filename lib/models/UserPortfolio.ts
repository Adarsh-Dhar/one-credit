import mongoose, { Document, Model, Schema } from 'mongoose';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface IUserPortfolio extends Document {
  user_id: string;                     // references the User._id (stored as string)
  fiat_card_ids: string[];            // array of FiatCard._id references
  last_sync_time: Date;
  total_balance_usd?: number;         // cached total balance across all cards
  total_points?: number;              // cached total points across all cards
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const UserPortfolioSchema = new Schema<IUserPortfolio>(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    fiat_card_ids: { type: [String], default: [] },
    last_sync_time: { type: Date, default: Date.now },
    total_balance_usd: { type: Number, default: 0 },
    total_points: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ─── Model export ─────────────────────────────────────────────────────────────

export const UserPortfolio: Model<IUserPortfolio> =
  mongoose.models.UserPortfolio || mongoose.model<IUserPortfolio>('UserPortfolio', UserPortfolioSchema);
