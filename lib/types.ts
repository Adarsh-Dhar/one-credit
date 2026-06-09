import { IFiatCard } from './models/FiatCard';

export interface WalletCard {
  key: string;
  name: string;
  issuer: string;
  cardImageUrl?: string;
  value: number;
  balance?: number;
  limit?: number;
  redemptionRate?: string;
  currency?: string;
  earnRates?: Record<string, number>;
  perks?: string[];
  rawCard?: IFiatCard;
  statementCredits?: IFiatCard['benefits_and_credits']['statement_credits'];
  portalBonuses?: IFiatCard['benefits_and_credits']['portal_bonuses'];
  protections?: IFiatCard['benefits_and_credits']['purchase_protections'];
  transferPartners?: IFiatCard['benefits_and_credits']['transfer_partners'];
}

// RUM Event types from extension
export interface RUMEvent {
  eventType: string;
  timestamp: number;
  section?: string;
  data?: Record<string, unknown>;
}

// RUM Signals - aggregated MongoDB document
export interface RUMSignals {
  userId: string;
  sessionId?: string;

  // Click & interaction telemetry
  transferPartnerTabClicks: number;
  cardDetailExpansions: number;

  // Dwell time (seconds)
  dwellOnTransferGuides: number;
  dwellOnTravelCards: number;
  dwellOnCashbackCards: number;
  dwellOnLoungeDetails: number;
  dwellOnAprSection: number;
  dwellOnAnnualFeeField: number;

  // Scroll depth signals
  scrolledPastAnnualFee: boolean;
  scrollDepthMax: number;

  // Flow / funnel
  abandonedRotatingActivation: boolean;
  backNavAfterRecommendation: boolean;

  // Custom business events (pushed from Next.js)
  cardViewCounts: Record<string, number>;
  extensionFireCount: number;
  transferPartnersClicked: string[];
  cardAddedToWallet: string | null;

  // Infrastructure signals from Dynatrace APM
  extensionAnalyzeApiCallCount: number;
}
