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
