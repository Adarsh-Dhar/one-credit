import { useState } from 'react';
import { buildPaymentPrompt } from '@/lib/prompts';
import { WalletCard } from '@/lib/types';

// DEPRECATED: This hook is currently broken as it calls /api/rum/analyze
// which is for RUM persona inference, not payment analysis.
// The correct endpoint for payment analysis is /api/extension/analyze.
// This hook needs to be refactored to use the correct API format.

type Step = 'category' | 'merchant' | 'amount' | 'analyzing' | 'approval' | 'success' | 'failed';

interface Merchant {
  name: string;
  logo: string;
  category: string;
}

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

interface UsePayFlowProps {
  userId: string | undefined;
  cards: WalletCard[];
  trackEvent: (event: string, data?: any) => void;
  trackCardView: (cardId: string) => void;
  CATEGORY_TO_EARN_KEY: Record<string, string>;
}

export function usePayFlow({
  userId,
  cards,
  trackEvent,
  trackCardView,
  CATEGORY_TO_EARN_KEY,
}: UsePayFlowProps) {
  const [step, setStep] = useState<Step>('category');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [amount, setAmount] = useState('');
  const [recommendation, setRecommendation] = useState<GeminiRecommendation | null>(null);
  const [txHash, setTxHash] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat);
    setStep('merchant');
    trackEvent('transaction_categorized', { category: cat.id, label: cat.label });
    trackCardView(cat.id);
  };

  const handleMerchantSelect = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setStep('amount');
    trackCardView(merchant.name);
  };

  const handleAmountSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || parsedAmount <= 0 || parsedAmount > 10000) {
      return;
    }

    trackEvent('spend_category_entered', {
      category: selectedCategory?.id,
      amount: parsedAmount,
    });

    setStep('analyzing');

    try {
      const prompt = buildPaymentPrompt(
        amount,
        selectedMerchant?.name || '',
        selectedCategory?.label || '',
        userId || ''
      );

      const res = await fetch('/api/rum/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      let rec: GeminiRecommendation;
      try {
        const clean = data.response.replace(/```json|```/g, '').trim();
        rec = JSON.parse(clean);
      } catch {
        const categoryKey = CATEGORY_TO_EARN_KEY[selectedCategory?.id ?? ''] ?? 'general';
        const bestCard = cards.reduce((best, current) => {
          const bestRate = best?.earnRates?.[categoryKey as keyof typeof best.earnRates] ?? 1.0;
          const currentRate = current?.earnRates?.[categoryKey as keyof typeof current.earnRates] ?? 1.0;
          return currentRate > bestRate ? current : best;
        }, cards[0]);

        const earnRate = bestCard?.earnRates?.[categoryKey as keyof typeof bestCard.earnRates] ?? 1.0;
        const cashReward = parseFloat(amount) * (earnRate / 100);

        rec = {
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
      setRecommendation(rec);
      setStep('approval');
    } catch {
      setStep('failed');
    }
  };

  const handleApprove = async () => {
    if (!recommendation || isProcessing) {
      return;
    }

    trackCardView(recommendation.bestCardKey);
    trackEvent('payment.approved', {
      card: recommendation.bestCardKey,
      amount: parseFloat(amount),
      merchant: selectedMerchant?.name,
    });

    setIsProcessing(true);

    await new Promise((r) => setTimeout(r, 2200));

    try {
      await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'updateBalances',
          toolInput: {
            userId,
            cardDebits: {
              [recommendation.bestCardKey]: { debit: recommendation.nativeReward },
            },
          },
        }),
      });

      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: 'spend',
          amountUsd: parseFloat(amount),
          cardId: recommendation.bestCardKey,
          category: selectedCategory?.id ?? 'other',
          merchant: selectedMerchant?.name ?? '',
          isEmi: false,
          pointsEarned: Math.round(recommendation.nativeReward * 100),
          rewardValueUsd: recommendation.nativeReward,
          description: `${selectedMerchant?.name} — $${amount}`,
          metadata: { offerSource: recommendation.offerSource },
        }),
      });

      await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'sync_after_redemption',
          toolInput: { sources: ['rewards'] },
        }),
      });

      setTxHash('0x' + Math.random().toString(16).slice(2, 18).toUpperCase());
      setStep('success');
    } catch {
      setStep('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setStep('category');
    setSelectedCategory(null);
    setSelectedMerchant(null);
    setAmount('');
    setRecommendation(null);
    setTxHash('');
  };

  return {
    step,
    selectedCategory,
    selectedMerchant,
    amount,
    setAmount,
    recommendation,
    txHash,
    isProcessing,
    handleCategorySelect,
    handleMerchantSelect,
    handleAmountSubmit,
    handleApprove,
    reset,
    setStep,
  };
}
