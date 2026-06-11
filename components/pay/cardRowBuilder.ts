import { computeTotalValue, walletCardToConversionCard } from '@/lib/op-conversion';
import { WalletCard } from '@/lib/types';

interface TransferPartner {
  cpp_min: number;
  cpp_max: number;
}

export interface CardRow {
  key: string;
  name: string;
  earnRate: number;
  cashReward: number;
  isWinner: boolean;
  currency: string;
  totalValue: number;
  creditFired: { name: string, amount: number } | null;
  portalBonus: { name: string, url: string, multiplier: number } | null;
  protectionValue: number;
  protectionLabels: string[];
  transferCppMin: number | null;
  transferCppMax: number | null;
  confidence: 'direct' | 'derived' | 'estimated';
}

export function buildCardRows(
  allCards: WalletCard[],
  amount: number,
  categoryKey: string
): CardRow[] {
  const cardRows: CardRow[] = allCards
    .map((card) => {
      const earnRate = (card.earnRates as Record<string, number>)?.[categoryKey] ?? card.earnRates?.general ?? 1;
      let cashReward = amount * (earnRate / 100);

      const conversionCard = walletCardToConversionCard(card as any);
      const totalValueResult = computeTotalValue(conversionCard, amount, categoryKey);

      const creditFired = totalValueResult.creditName
        ? { name: totalValueResult.creditName, amount: totalValueResult.creditUsd }
        : null;

      const portalBonus = totalValueResult.portalName
        ? { name: totalValueResult.portalName, url: '', multiplier: 0 }
        : null;

      if (totalValueResult.portalName && totalValueResult.portalUsd > 0) {
        cashReward = totalValueResult.portalUsd;
      }

      const transferPartners = (card.transferPartners as TransferPartner[]) || [];
      const transferCentsPerPointMin = transferPartners.length > 0 ? Math.min(...transferPartners.map((p) => p.cpp_min)) : null;
      const transferCentsPerPointMax = transferPartners.length > 0 ? Math.max(...transferPartners.map((p) => p.cpp_max)) : null;

      return {
        key: card.key,
        name: card.name,
        earnRate,
        cashReward,
        isWinner: false,
        currency: card.currency || 'USD',
        totalValue: totalValueResult.totalValue,
        creditFired,
        portalBonus,
        protectionValue: totalValueResult.protectionUsd,
        protectionLabels: totalValueResult.protectionLabels,
        transferCppMin: transferCentsPerPointMin,
        transferCppMax: transferCentsPerPointMax,
        confidence: totalValueResult.confidence,
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue);

  if (cardRows.length > 0) {
    cardRows[0].isWinner = true;
  }

  return cardRows;
}
