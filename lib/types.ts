import { CardDefinition } from './cards';
import { IFiatCard } from './models/FiatCard';

export interface WalletCard extends CardDefinition {
  value: number;
  balance?: number;
  limit?: number;
  redemptionRate?: string;
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
  rageClicksOnRotatingCategory: number;
  transferPartnerTabClicks: number;
  cashbackTabClicks: number;
  offersTabClicks: number;
  cardDetailExpansions: number;
  calculateBestCardClicks: number;

  // Dwell time (seconds)
  dwellOnTransferGuides: number;
  dwellOnTravelCards: number;
  dwellOnCashbackCards: number;
  dwellOnLoungeDetails: number;
  dwellOnAprSection: number;
  dwellOnAnnualFeeField: number;

  // Scroll depth signals
  scrolledPastFinePrint: boolean;
  scrolledPastAnnualFee: boolean;

  // Flow / funnel
  abandonedRotatingActivation: boolean;
  abandonedCardComparison: boolean;
  backNavAfterRecommendation: boolean;

  // Custom business events (pushed from Next.js)
  cardsViewed: string[];
  cardsCompared: string[];
  extensionFireCount: number;
  redemptionTypesViewed: string[];
  transferPartnersClicked: string[];
  cardAddedToWallet: string | null;

  // Infrastructure signals from Dynatrace APM
  extensionAnalyzeApiCallCount: number;
  aiAnalyzeAvgResponseMs: number;
}
