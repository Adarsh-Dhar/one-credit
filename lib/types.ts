import { CardDefinition } from './cards';

export interface WalletCard extends CardDefinition {
  value: number;
  balance?: number;
  limit?: number;
  redemptionRate?: string;
  rawCard?: any;
  statementCredits?: any[];
  portalBonuses?: any[];
  protections?: any;
  transferPartners?: any[];
}
