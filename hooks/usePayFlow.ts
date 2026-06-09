import { useState } from 'react';
import { WalletCard } from '@/lib/types';
import {
  buildRecommendationFromAPI,
  buildFallbackRecommendation,
  callAnalyzeAPI,
  updateCardBalances,
  createTransaction,
  syncAfterRedemption,
  generateTxHash,
  isInvalidAmount,
} from './usePayFlowHelpers';

// This hook calls /api/extension/analyze for payment analysis.

export enum Step {
  CATEGORY = 'category',
  MERCHANT = 'merchant',
  AMOUNT = 'amount',
  ANALYZING = 'analyzing',
  APPROVAL = 'approval',
  SUCCESS = 'success',
  FAILED = 'failed',
}

// Typed event payloads for type-safe event tracking
interface TransactionCategorizedEvent {
  category: string;
  label: string;
}

interface SpendCategoryEnteredEvent {
  category: string;
  amount: number;
}

interface PaymentApprovedEvent {
  card: string;
  amount: number;
  merchant: string;
}

type EventPayloads =
  | { event: 'transaction_categorized'; payload: TransactionCategorizedEvent }
  | { event: 'spend_category_entered'; payload: SpendCategoryEnteredEvent }
  | { event: 'payment.approved'; payload: PaymentApprovedEvent }
  | { event: string; payload?: never };

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
  trackEvent: <E extends EventPayloads['event']>(event: E, payload: Extract<EventPayloads, { event: E }>['payload']) => void;
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
  const [step, setStep] = useState<Step>(Step.CATEGORY);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [amount, setAmount] = useState('');
  const [recommendation, setRecommendation] = useState<GeminiRecommendation | null>(null);
  const [txHash, setTxHash] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat);
    setStep(Step.MERCHANT);
    trackEvent('transaction_categorized', { category: cat.id, label: cat.label });
    trackCardView(cat.id);
  };

  const handleMerchantSelect = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setStep(Step.AMOUNT);
    trackCardView(merchant.name);
  };

  const handleAmountSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (isInvalidAmount(amount)) {
      return;
    }

    if (selectedCategory) {
      trackEvent('spend_category_entered', {
        category: selectedCategory.id,
        amount: parsedAmount,
      });
    }

    setStep(Step.ANALYZING);

    try {
      const data = await callAnalyzeAPI(selectedMerchant, amount, selectedCategory, userId);

      let recommendation: GeminiRecommendation;
      if (data.winner) {
        recommendation = buildRecommendationFromAPI(data);
      } else {
        recommendation = buildFallbackRecommendation(cards, parsedAmount, selectedCategory, CATEGORY_TO_EARN_KEY);
      }
      setRecommendation(recommendation);
      setStep(Step.APPROVAL);
    } catch {
      setStep(Step.FAILED);
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
      merchant: selectedMerchant?.name || 'Unknown',
    });

    setIsProcessing(true);

    try {
      await updateCardBalances(userId, recommendation.bestCardKey, recommendation.nativeReward);
      await createTransaction(userId, amount, recommendation.bestCardKey, selectedCategory, selectedMerchant, recommendation.nativeReward, recommendation.offerSource);
      await syncAfterRedemption();
      setTxHash(generateTxHash());
      setStep(Step.SUCCESS);
    } catch {
      setStep(Step.FAILED);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setStep(Step.CATEGORY);
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
