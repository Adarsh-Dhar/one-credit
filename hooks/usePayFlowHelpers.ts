import { WalletCard } from '@/lib/types';
import { PAYMENT_LIMITS } from '@/lib/constants';

const TX_HASH_CONSTANTS = {
  HEX_PREFIX: '0x',
  SLICE_START: 2,
  SLICE_END: 18,
} as const;

const REWARD_CONSTANTS = {
  POINTS_MULTIPLIER: 100,
  DEFAULT_RATE: 1.0,
} as const;

interface Category {
  id: string;
  label: string;
}

interface GeminiRecommendation {
  bestCard: string;
  bestCardKey: string;
  nativeReward: number;
  rewardRate: number;
  reasoning: string;
  offerFound: boolean;
  offerSource: string;
  creditFired?: { name: string; amount: number };
  portalUsed?: { name: string; url: string };
  protectionNotes?: string[];
  totalValue?: number;
}

interface Merchant {
  name: string;
  logo: string;
  category: string;
}

interface APIAnalysisResponse {
  winner: {
    name: string;
    cardKey: string;
    valuation: {
      trueRewardValueUsd: number;
    };
    earn: {
      earnAudit: {
        rate: number;
      };
      portalBonusApplied: boolean;
      portalBonusName: string;
    };
    reasoning?: string;
  };
}

export function buildRecommendationFromAPI(data: APIAnalysisResponse): GeminiRecommendation {
  return {
    bestCard: data.winner.name,
    bestCardKey: data.winner.cardKey,
    nativeReward: data.winner.valuation.trueRewardValueUsd,
    rewardRate: data.winner.earn.earnAudit.rate / 100,
    reasoning: data.winner.reasoning || 'Best available rewards for this category.',
    offerFound: data.winner.earn.portalBonusApplied || false,
    offerSource: data.winner.earn.portalBonusName || 'none',
    creditFired: undefined,
    portalUsed: undefined,
    protectionNotes: undefined,
    totalValue: undefined,
  };
}

export function buildFallbackRecommendation(
  cards: WalletCard[],
  amount: number,
  selectedCategory: Category | null,
  CATEGORY_TO_EARN_KEY: Record<string, string>
): GeminiRecommendation {
  const categoryKey = CATEGORY_TO_EARN_KEY[selectedCategory?.id ?? ''] ?? 'general';
  const bestCard = cards.reduce((best, current) => {
    const bestRate = best?.earnRates?.[categoryKey as keyof typeof best.earnRates] ?? REWARD_CONSTANTS.DEFAULT_RATE;
    const currentRate = current?.earnRates?.[categoryKey as keyof typeof current.earnRates] ?? REWARD_CONSTANTS.DEFAULT_RATE;
    return currentRate > bestRate ? current : best;
  }, cards[0]);

  const earnRate = bestCard?.earnRates?.[categoryKey as keyof typeof bestCard.earnRates] ?? REWARD_CONSTANTS.DEFAULT_RATE;
  const cashReward = amount * (earnRate / 100);

  return {
    bestCard: bestCard?.name ?? 'Your best card',
    bestCardKey: bestCard?.key ?? '',
    nativeReward: cashReward,
    rewardRate: earnRate / 100,
    reasoning: 'Best available rewards for this category.',
    offerFound: false,
    offerSource: 'none',
    creditFired: undefined,
    portalUsed: undefined,
    protectionNotes: undefined,
    totalValue: undefined,
  };
}

async function fetchAPI<T>(endpoint: string, body: object, errorMessage: string): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`${errorMessage} with status ${res.status}`);
  }

  return await res.json() as T;
}

export async function callAnalyzeAPI(
  selectedMerchant: Merchant | null,
  amount: string,
  selectedCategory: Category | null,
  userId: string | undefined
): Promise<APIAnalysisResponse> {
  return fetchAPI<APIAnalysisResponse>(
    '/api/extension/analyze',
    {
      product: {
        name: selectedMerchant?.name || '',
        price: parseFloat(amount),
        category: selectedCategory?.label || '',
        merchant: selectedMerchant?.name || '',
        url: '',
        isEmi: false,
        isForeignMerchant: false,
      },
      userId: userId || '',
    },
    'API request failed'
  );
}

export async function updateCardBalances(
  userId: string | undefined,
  bestCardKey: string,
  nativeReward: number
): Promise<void> {
  await fetchAPI<void>(
    '/api/tools/execute',
    {
      toolName: 'updateBalances',
      toolInput: {
        userId,
        cardDebits: {
          [bestCardKey]: { debit: nativeReward },
        },
      },
    },
    'Failed to update card balances'
  );
}

export async function createTransaction(
  userId: string | undefined,
  amount: string,
  bestCardKey: string,
  selectedCategory: Category | null,
  selectedMerchant: Merchant | null,
  nativeReward: number,
  offerSource: string
): Promise<void> {
  await fetchAPI<void>(
    '/api/transactions',
    {
      userId,
      type: 'spend',
      amountUsd: parseFloat(amount),
      cardId: bestCardKey,
      category: selectedCategory?.id ?? 'other',
      merchant: selectedMerchant?.name ?? '',
      isEmi: false,
      pointsEarned: Math.round(nativeReward * REWARD_CONSTANTS.POINTS_MULTIPLIER),
      rewardValueUsd: nativeReward,
      description: `${selectedMerchant?.name} — $${amount}`,
      metadata: { offerSource },
    },
    'Failed to create transaction'
  );
}

export async function syncAfterRedemption(): Promise<void> {
  await fetchAPI<void>(
    '/api/tools/execute',
    {
      toolName: 'sync_after_redemption',
      toolInput: { sources: ['rewards'] },
    },
    'Failed to sync after redemption'
  );
}

export function generateTxHash(): string {
  return TX_HASH_CONSTANTS.HEX_PREFIX + Math.random().toString(16).slice(TX_HASH_CONSTANTS.SLICE_START, TX_HASH_CONSTANTS.SLICE_END).toUpperCase();
}

export function isInvalidAmount(amount: string): boolean {
  const parsedAmount = parseFloat(amount);
  return !amount || parsedAmount <= PAYMENT_LIMITS.MIN_AMOUNT_USD || parsedAmount > PAYMENT_LIMITS.MAX_AMOUNT_USD;
}
