import mongoose from 'mongoose';

const RUMSignalsSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    sessionId: { type: String },

    // Click & interaction telemetry
    transferPartnerTabClicks: { type: Number, default: 0 },
    cardDetailExpansions: { type: Number, default: 0 },

    // Dwell time (seconds)
    dwellOnTransferGuides: { type: Number, default: 0 },
    dwellOnTravelCards: { type: Number, default: 0 },
    dwellOnCashbackCards: { type: Number, default: 0 },
    dwellOnLoungeDetails: { type: Number, default: 0 },
    dwellOnAprSection: { type: Number, default: 0 },
    dwellOnAnnualFeeField: { type: Number, default: 0 },

    // Scroll depth signals
    scrolledPastAnnualFee: { type: Boolean, default: false },
    scrollDepthMax: { type: Number, default: 0 },

    // Flow / funnel
    abandonedRotatingActivation: { type: Boolean, default: false },
    backNavAfterRecommendation: { type: Boolean, default: false },

    // Custom business events (pushed from Next.js)
    cardViewCounts: { type: Map, of: Number, default: {} },
    extensionFireCount: { type: Number, default: 0 },
    transferPartnersClicked: { type: [String], default: [] },
    cardAddedToWallet: { type: String, default: null },

    // Infrastructure signals from Dynatrace APM
    extensionAnalyzeApiCallCount: { type: Number, default: 0 },

    // Extension purchase signals
    analyzedCategories: { type: Map, of: Number, default: {} },
    purchasedCategories: { type: Map, of: Number, default: {} },
    lastPurchasedMerchant: { type: String, default: null },
  },
  { timestamps: true }
);

export const RUMSignals = mongoose.models.RUMSignals || mongoose.model('RUMSignals', RUMSignalsSchema);
