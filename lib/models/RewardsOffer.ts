import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRewardsOffer extends Document {
  // Unified identifier across all three sources
  offerId: string;
  source: 'cardlytics' | 'network' | 'affiliate';

  // Common fields (normalized)
  merchantName: string;
  category: string;          // travel, dining, grocery, shopping, entertainment, gas, pharmacy, etc.
  rewardType: 'cashback' | 'percentage_off' | 'fixed_amount' | 'points_multiplier' | 'cpa' | 'pct_sale' | 'pct_sale_tiered';
  rewardRate: number;        // normalized 0.05 = 5%; for CPA, the flat dollar amount
  minSpend: number;
  maxReward: number;
  active: boolean;
  startDate: string;
  endDate: string;
  description: string;
  terms: string[];

  // Source-specific extras stored as flexible sub-docs
  cardlyticsData?: {
    cashbackRate: number;
    cardNetworks: string[];
    impressionCount: number;
    clickCount: number;
    redemptionCount: number;
    syncCount: number;
  };

  networkData?: {
    network: 'VISA' | 'MASTERCARD';
    discountType: string;
    eligibleTiers: string[];
    geoTargets: Array<{ country: string; regions?: string[] }>;
    channels: string[];
    impressionCount: number;
    activationCount: number;
    redemptionCount: number;
    syncCount: number;
  };

  affiliateData?: {
    network: 'rakuten' | 'impact';
    vertical: string;
    commissionType: string;
    commissionRate: number;
    tieredRates?: Array<{ minSales: number; maxSales?: number; rate: number }>;
    trackingUrl: string;
    promoCode?: string;
    cookieWindow: number;
    minEpc: number;
    clickCount: number;
    conversionCount: number;
    revenue: number;
    syncCount: number;
  };

  // Fivetran sync metadata
  fivetranSyncId: string;
  lastSyncedAt: Date;
  updatedAt: Date;
  createdAt: Date;
}

const GeoTargetSchema = new Schema(
  { country: String, regions: [String] },
  { _id: false }
);

const TieredRateSchema = new Schema(
  { minSales: Number, maxSales: Number, rate: Number },
  { _id: false }
);

const RewardsOfferSchema = new Schema<IRewardsOffer>(
  {
    offerId:      { type: String, required: true, unique: true, index: true },
    source:       { type: String, enum: ['cardlytics', 'network', 'affiliate'], required: true, index: true },
    merchantName: { type: String, required: true, index: true },
    category:     { type: String, required: true, index: true },
    rewardType:   { type: String, required: true },
    rewardRate:   { type: Number, required: true },
    minSpend:     { type: Number, default: 0 },
    maxReward:    { type: Number, default: 0 },
    active:       { type: Boolean, default: true, index: true },
    startDate:    { type: String },
    endDate:      { type: String },
    description:  { type: String },
    terms:        [String],

    cardlyticsData: {
      cashbackRate:     Number,
      cardNetworks:     [String],
      impressionCount:  Number,
      clickCount:       Number,
      redemptionCount:  Number,
      syncCount:        Number,
    },

    networkData: {
      network:          String,
      discountType:     String,
      eligibleTiers:    [String],
      geoTargets:       [GeoTargetSchema],
      channels:         [String],
      impressionCount:  Number,
      activationCount:  Number,
      redemptionCount:  Number,
      syncCount:        Number,
    },

    affiliateData: {
      network:        String,
      vertical:       String,
      commissionType: String,
      commissionRate: Number,
      tieredRates:    [TieredRateSchema],
      trackingUrl:    String,
      promoCode:      String,
      cookieWindow:   Number,
      minEpc:         Number,
      clickCount:     Number,
      conversionCount:Number,
      revenue:        Number,
      syncCount:      Number,
    },

    fivetranSyncId: { type: String, required: true },
    lastSyncedAt:   { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'rewards_offers',
  }
);

// Compound indexes for common Gemini query patterns
RewardsOfferSchema.index({ active: 1, category: 1, rewardRate: -1 });
RewardsOfferSchema.index({ active: 1, source: 1, merchantName: 1 });
RewardsOfferSchema.index({ 'networkData.geoTargets.country': 1, active: 1 });
RewardsOfferSchema.index({ 'affiliateData.vertical': 1, 'affiliateData.minEpc': -1 });
RewardsOfferSchema.index({ lastSyncedAt: -1 });

export const RewardsOffer: Model<IRewardsOffer> =
  mongoose.models.RewardsOffer || mongoose.model<IRewardsOffer>('RewardsOffer', RewardsOfferSchema);
