'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Navigation } from '@/components/Navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, ShoppingCart, Utensils, Fuel, Tv, Pill,
  ShoppingBag, Zap, CheckCircle2, XCircle,
  CreditCard, ArrowRight, Sparkles
} from 'lucide-react';
import { buildPaymentPrompt } from '@/lib/prompts';
import { WalletCard } from '@/lib/types';
import { StepIndicator } from '@/components/pay/StepIndicator';
import { AITerminal } from '@/components/pay/TerminalAnalyzer';
import { ArbitrageReceipt } from '@/components/pay/ArbitrageReceipt';
import { useRUM, useDwellTime, useScrollDepth } from '@/hooks/useRUM';

// ── Types ──────────────────────────────────────────────────────────────────
interface Merchant {
  name: string;
  logo: string; // emoji fallback
  category: string;
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

// ── Data ───────────────────────────────────────────────────────────────────
const CATEGORY_TO_EARN_KEY: Record<string, string> = {
  travel:        'flights',
  dining:        'dining',
  grocery:       'groceries',
  shopping:      'shopping',
  gas:           'fuel',
  entertainment: 'streaming',
  pharmacy:      'pharmacy',
  subscription:  'streaming',
};

const CATEGORIES = [
  { id: 'travel',        label: 'Travel',       icon: Plane,       color: 'from-blue-500 to-indigo-600' },
  { id: 'dining',        label: 'Dining',       icon: Utensils,    color: 'from-orange-500 to-red-600' },
  { id: 'grocery',       label: 'Grocery',      icon: ShoppingCart,color: 'from-green-500 to-emerald-600' },
  { id: 'shopping',      label: 'Shopping',     icon: ShoppingBag, color: 'from-violet-500 to-purple-600' },
  { id: 'gas',           label: 'Gas',          icon: Fuel,        color: 'from-yellow-500 to-amber-600' },
  { id: 'entertainment', label: 'Entertainment',icon: Tv,          color: 'from-pink-500 to-rose-600' },
  { id: 'pharmacy',      label: 'Pharmacy',     icon: Pill,        color: 'from-teal-500 to-cyan-600' },
  { id: 'subscription',  label: 'Subscription', icon: Zap,         color: 'from-slate-500 to-slate-600' },
];

const MERCHANTS: Merchant[] = [
  // travel
  { name: 'Qatar Airways',    logo: '✈️', category: 'travel' },
  { name: 'Delta Air Lines',  logo: '✈️', category: 'travel' },
  { name: 'British Airways',  logo: '✈️', category: 'travel' },
  { name: 'Marriott Hotels',  logo: '🏨', category: 'travel' },
  { name: 'Hilton Honors',    logo: '🏨', category: 'travel' },
  { name: 'Expedia',          logo: '🌍', category: 'travel' },
  { name: 'Hertz Car Rental', logo: '🚗', category: 'travel' },
  // dining
  { name: 'Starbucks',        logo: '☕', category: 'dining' },
  { name: 'Uber Eats',        logo: '🛵', category: 'dining' },
  { name: 'DoorDash',         logo: '🍕', category: 'dining' },
  { name: 'Nobu Restaurants', logo: '🍣', category: 'dining' },
  // grocery
  { name: 'Whole Foods',      logo: '🛒', category: 'grocery' },
  { name: 'Walmart',          logo: '🛒', category: 'grocery' },
  { name: 'Target',           logo: '🎯', category: 'grocery' },
  // shopping
  { name: 'Best Buy',         logo: '💻', category: 'shopping' },
  { name: 'Apple Store',      logo: '🍎', category: 'shopping' },
  { name: 'Sephora',          logo: '💄', category: 'shopping' },
  { name: 'Ulta Beauty',      logo: '💅', category: 'shopping' },
  // gas
  { name: 'Shell',            logo: '⛽', category: 'gas' },
  // entertainment
  { name: 'AMC Theatres',     logo: '🎬', category: 'entertainment' },
  { name: 'Spotify',          logo: '🎵', category: 'subscription' },
  { name: 'Netflix',          logo: '🎬', category: 'subscription' },
  // pharmacy
  { name: 'CVS Pharmacy',     logo: '💊', category: 'pharmacy' },
  { name: 'Walgreens',        logo: '💊', category: 'pharmacy' },
];

// ── Steps ──────────────────────────────────────────────────────────────────
type Step = 'category' | 'merchant' | 'amount' | 'analyzing' | 'approval' | 'success' | 'failed';

export default function PayPage() {
  const { data: session } = useSession();
  const { trackEvent, trackTabClick, trackCardView } = useRUM();
  const { startDwell, endDwell } = useDwellTime('paymentFlow');
  const { startTracking: startScrollTracking, stopTracking: stopScrollTracking } = useScrollDepth([25, 50, 75, 90, 100]);
  const [step, setStep]                   = useState<Step>('category');
  const [selectedCategory, setCategory]   = useState<typeof CATEGORIES[0] | null>(null);
  const [selectedMerchant, setMerchant]   = useState<Merchant | null>(null);
  const [amount, setAmount]               = useState('');
  const [cards, setCards]                 = useState<WalletCard[]>([]);
  const [recommendation, setRec]          = useState<GeminiRecommendation | null>(null);
  const [txHash, setTxHash]               = useState('');
  const [isProcessing, setIsProcessing]   = useState(false);

  const userId = session?.user?.email;

  // Initialize RUM tracking on mount
  useEffect(() => {
    trackTabClick('cashback');
    startDwell();
    startScrollTracking();

    return () => {
      endDwell();
      stopScrollTracking();
    };
  }, [trackTabClick, startDwell, endDwell, startScrollTracking, stopScrollTracking]);

  // Fetch user cards once
  useEffect(() => {
    if (!userId) {
      return;
    }
    fetch(`/api/wallet?email=${encodeURIComponent(userId)}`)
      .then(r => r.json())
      .then(d => setCards(d.cards ?? []));
  }, [userId]);

  if (!userId) {
    // Handle unauthenticated case - redirect or show empty state
    return <div>Please sign in to access this page</div>;
  }

  const filteredMerchants = selectedCategory
    ? MERCHANTS.filter(m => m.category === selectedCategory.id)
    : [];

  // ── Step handlers ──────────────────────────────────────────────────────
  const handleCategorySelect = (cat: typeof CATEGORIES[0]) => {
    setCategory(cat);
    setStep('merchant');
    // Track transaction categorized event
    trackEvent('transaction_categorized', { category: cat.id, label: cat.label });
    trackCardView(cat.id);
  };

  const handleMerchantSelect = (merchant: Merchant) => {
    setMerchant(merchant);
    setStep('amount');
    trackCardView(merchant.name);
  };

  const handleAmountSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || parsedAmount <= 0 || parsedAmount > 10000) {
      return;
    }

    // Track spend category amount entered
    trackEvent('spend_category_entered', {
      category: selectedCategory?.id,
      amount: parsedAmount
    });

    setStep('analyzing');

    try {
      // Ask Gemini which card to use and what rewards exist
      const prompt = buildPaymentPrompt(
        amount,
        selectedMerchant?.name || '',
        selectedCategory?.label || '',
        userId
      );

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      // Parse Gemini JSON response
      let rec: GeminiRecommendation;
      try {
        const clean = data.response.replace(/```json|```/g, '').trim();
        rec = JSON.parse(clean);
      } catch {
        // Fallback if Gemini doesn't return clean JSON - use two-step formula
        const categoryKey = CATEGORY_TO_EARN_KEY[selectedCategory?.id ?? ''] ?? 'general';

        // Find the card with the highest earn rate for this category
        const bestCard = cards.reduce((best, current) => {
          const bestRate = best?.earnRates?.[categoryKey as keyof typeof best.earnRates] ?? 1.0;
          const currentRate = current?.earnRates?.[categoryKey as keyof typeof current.earnRates] ?? 1.0;
          return currentRate > bestRate ? current : best;
        }, cards[0]);

        const earnRate = bestCard?.earnRates?.[categoryKey as keyof typeof bestCard.earnRates] ?? 1.0;
        // earnRate is a whole number (e.g., 3 = 3%), so divide by 100 to get decimal
        const cashReward = parseFloat(amount) * (earnRate / 100);

        rec = {
          bestCard:   bestCard?.name ?? 'Your best card',
          bestCardKey: bestCard?.key ?? '',
          nativeReward: cashReward,
          rewardRate: earnRate / 100,
          reasoning:  'Best available rewards for this category.',
          offerFound: false,
          offerSource: 'none',
          creditFired: undefined,
          portalUsed: undefined,
          protectionNotes: undefined,
          totalValue: undefined,
        };
      }
      setRec(rec);
      setStep('approval');
    } catch {
      setStep('failed');
    }
  };

  const handleApprove = async () => {
    if (!recommendation || isProcessing) {
      return;
    }
    
    // Track card recommendation acceptance
    trackCardView(recommendation.bestCardKey);
    trackEvent('payment.approved', { 
      card: recommendation.bestCardKey, 
      amount: parseFloat(amount),
      merchant: selectedMerchant?.name 
    });
    
    setIsProcessing(true);

    // Wait for animation
    await new Promise(r => setTimeout(r, 2200));

    try {
      // Debit the car)
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

      // Record transaction
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,                                       // ← required by the POST handler
          type: 'spend',
          amountUsd:  parseFloat(amount),               // ← top-level, indexed field
          cardId:     recommendation.bestCardKey,       // ← top-level, indexed field
          category:   selectedCategory?.id ?? 'other', // ← top-level, indexed field
          merchant:   selectedMerchant?.name ?? '',     // ← top-level, indexed field
          isEmi:      false,
          pointsEarned:   Math.round(recommendation.nativeReward * 100), // ← cents as points proxy; adjust to real points if Gemini returns them
          rewardValueUsd: recommendation.nativeReward,  // ← USD value of reward earned
          // keep these for UI back-compat
          description: `${selectedMerchant?.name} — $${amount}`,
          metadata: { offerSource: recommendation.offerSource },
        }),
      });

      // Trigger re-sync
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
    setCategory(null);
    setMerchant(null);
    setAmount('');
    setRec(null);
    setTxHash('');
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Progress bar */}
        {step !== 'failed' && <StepIndicator step={step as any} />}

        <AnimatePresence mode="wait">

          {/* ── STEP 1: Category ── */}
          {step === 'category' && (
            <motion.div key="category"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="text-2xl font-bold text-white mb-2">What are you paying for?</h2>
              <p className="text-slate-400 mb-8">Select a spend category</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-section="category-selection">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button key={cat.id} onClick={() => handleCategorySelect(cat)}
                      className={`bg-gradient-to-br ${cat.color} p-4 rounded-xl flex flex-col items-center gap-2
                        hover:scale-105 transition-all duration-200 cursor-pointer shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                      <span className="text-white text-sm font-medium">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Merchant ── */}
          {step === 'merchant' && selectedCategory && (
            <motion.div key="merchant"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <button onClick={() => setStep('category')} className="text-slate-400 hover:text-white mb-4 text-sm">← Back</button>
              <h2 className="text-2xl font-bold text-white mb-2">Choose merchant</h2>
              <p className="text-slate-400 mb-8">{selectedCategory.label} merchants with live reward offers</p>
              <div className="grid grid-cols-2 gap-3">
                {filteredMerchants.map(m => (
                  <button key={m.name} onClick={() => handleMerchantSelect(m)}
                    className="bg-slate-800 border border-slate-700 hover:border-purple-500 rounded-xl p-4
                      flex items-center gap-3 transition-all duration-200 hover:bg-slate-700 cursor-pointer">
                    <span className="text-3xl">{m.logo}</span>
                    <span className="text-white font-medium text-left">{m.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Amount ── */}
          {step === 'amount' && selectedMerchant && (
            <motion.div key="amount"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <button onClick={() => setStep('merchant')} className="text-slate-400 hover:text-white mb-4 text-sm">← Back</button>
              <h2 className="text-2xl font-bold text-white mb-2">How much?</h2>
              <div className="flex items-center gap-3 mb-8">
                <span className="text-4xl">{selectedMerchant.logo}</span>
                <span className="text-slate-300 text-lg">{selectedMerchant.name}</span>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
                <label className="text-slate-400 text-sm mb-2 block">Amount (USD)</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-3xl">$</span>
                  <input
                    type="number"
                    min="0.01"
                    max="10000"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-transparent text-white text-4xl font-bold w-full outline-none placeholder-slate-600"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2 mb-8">
                {['25', '50', '100', '200', '500'].map(v => (
                  <button key={v} onClick={() => setAmount(v)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300
                      rounded-lg py-2 text-sm transition-colors">
                    ${v}
                  </button>
                ))}
              </div>

              <button onClick={handleAmountSubmit}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 text-white font-bold
                  py-4 rounded-xl hover:from-purple-700 hover:to-yellow-600 transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                Analyze with AI
              </button>
            </motion.div>
          )}

          {/* ── STEP 4: Analyzing ── */}
          {step === 'analyzing' && (
            <motion.div key="analyzing"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div data-section="card-recommendation">
                <AITerminal
                  merchant={selectedMerchant?.name || ''}
                  category={selectedCategory?.label || ''}
                  userId={userId}
                  cardCount={cards.length}
                />
              </div>
            </motion.div>
          )}

          {/* ── STEP 5: Approval (crypto wallet animation) ── */}
          {step === 'approval' && recommendation && (
            <motion.div key="approval"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>

              <h2 className="text-2xl font-bold text-white mb-1 text-center">Confirm Payment</h2>
              <p className="text-slate-400 text-center mb-8">Review your transaction</p>

              {/* Token flow animation — the crypto wallet moment */}
              <TokenFlowAnimation
                fromCard={recommendation.bestCard}
                toMerchant={selectedMerchant!}
                amount={parseFloat(amount)}
              />

              {/* Recommendation card */}
              <div className="bg-slate-800 border border-purple-500/40 rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-medium">AI Recommendation</span>
                  {recommendation.offerFound && (
                    <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      Live offer from {recommendation.offerSource}
                    </span>
                  )}
                </div>
                <p className="text-white font-semibold mb-1">Use: {recommendation.bestCard}</p>
                <p className="text-slate-400 text-sm">{recommendation.reasoning}</p>
                <div className="mt-3 flex gap-4">
                  <div>
                    <p className="text-slate-500 text-xs">Reward rate</p>
                    <p className="text-green-400 font-bold">{(recommendation.rewardRate * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">You earn</p>
                    <p className="text-purple-400 font-bold">+${recommendation.nativeReward?.toFixed(2)} USD</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Amount</p>
                    <p className="text-white font-bold">${parseFloat(amount).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Approve / Reject buttons */}
              <div className="flex gap-3">
                <button onClick={reset}
                  className="flex-1 border border-red-500/50 text-red-400 hover:bg-red-500/10
                    rounded-xl py-4 font-bold transition-all flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Reject
                </button>
                <button onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-2 flex-grow bg-gradient-to-r from-purple-600 to-green-500
                    text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-green-600
                    transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25
                    disabled:opacity-40 disabled:cursor-not-allowed">
                  <CheckCircle2 className="w-5 h-5" />
                  {isProcessing ? 'Processing...' : 'Approve Payment'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 6: Success — Arbitrage Receipt ── */}
          {step === 'success' && (
            <ArbitrageReceipt
              merchant={selectedMerchant?.name ?? ''}
              amount={parseFloat(amount)}
              recommendation={recommendation}
              txHash={txHash}
              onReset={reset}
              allCards={cards}
              categoryKey={CATEGORY_TO_EARN_KEY[selectedCategory?.id ?? ''] ?? 'general'}
            />
          )}

          {/* ── STEP 7: Failed ── */}
          {step === 'failed' && (
            <motion.div key="failed"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-12">
              <XCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-2">Transaction Failed</h2>
              <p className="text-slate-400 mb-8">Something went wrong. Please try again.</p>
              <button onClick={reset}
                className="bg-slate-700 text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-600">
                Try Again
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function TokenFlowAnimation({
  fromCard, toMerchant, amount
}: {
  fromCard: string;
  toMerchant: Merchant;
  amount: number;
}) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 mb-5">
      <div className="flex items-center justify-between gap-4">

        {/* From: Card */}
        <div className="flex-1 relative">
          {/* Winner glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-yellow-500 rounded-xl animate-pulse opacity-60 blur-sm" />
          <div className="relative bg-slate-800 rounded-xl p-4 text-center border border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.6)]">
            <CreditCard className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-white text-xs font-medium leading-tight">{fromCard}</p>
            <p className="text-slate-500 text-xs mt-1">-${amount.toFixed(2)}</p>
          </div>
        </div>

        {/* Animated token flow */}
        <div className="flex items-center gap-1 relative w-16">
          <TokenParticles />
          <ArrowRight className="w-5 h-5 text-slate-600" />
          <span className="text-purple-400 text-xs font-bold text-center">
            +${amount.toFixed(2)} USD
          </span>
        </div>

        {/* To: Merchant */}
        <div className="flex-1 bg-slate-800 rounded-xl p-4 text-center border border-green-500/40 opacity-80">
          <span className="text-4xl block mb-1">{toMerchant.logo}</span>
          <p className="text-white text-xs font-medium leading-tight">{toMerchant.name}</p>
          <p className="text-slate-500 text-xs mt-1">${amount.toFixed(2)}</p>
        </div>

      </div>
    </div>
  );
}

function TokenParticles() {
  const particles = Array.from({ length: 6 }, (_, i) => i);
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {particles.map(i => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-purple-400"
          initial={{ x: - 20, opacity: 0, scale: 0 }}
          animate={{
            x: [- 20, 0, 20],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
          style={{ top: `${30 + (i % 3) * 15}%` }}
        />
      ))}
    </div>
  );
}
