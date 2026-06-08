'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Navigation } from '@/components/Navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, ShoppingCart, Utensils, Fuel, Tv, Pill,
  ShoppingBag, Zap, CheckCircle2, XCircle,
  CreditCard, ArrowRight, Sparkles
} from 'lucide-react';
import { StepIndicator } from '@/components/pay/StepIndicator';
import { AITerminal } from '@/components/pay/TerminalAnalyzer';
import { ArbitrageReceipt } from '@/components/pay/ArbitrageReceipt';
import { useRUM, useDwellTime, useScrollDepth } from '@/hooks/useRUM';
import { useWallet } from '@/hooks/useWallet';
import { usePayFlow } from '@/hooks/usePayFlow';

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

// ── Types ──────────────────────────────────────────────────────────────────
interface Merchant {
  name: string;
  logo: string;
  category: string;
}

export default function PayPage() {
  const { data: session } = useSession();
  const { trackEvent, trackTabClick, trackCardView } = useRUM();
  const { startDwell, endDwell } = useDwellTime('paymentFlow');
  const { startTracking: startScrollTracking, stopTracking: stopScrollTracking } = useScrollDepth([25, 50, 75, 90, 100]);
  const { cards: walletCards } = useWallet();
  const userId = session?.user?.id;

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

  // Use the extracted pay flow hook
  const payFlow = usePayFlow({
    userId,
    cards: walletCards,
    trackEvent,
    trackCardView,
    CATEGORY_TO_EARN_KEY,
  });

  if (!userId) {
    // Handle unauthenticated case - redirect or show empty state
    return <div>Please sign in to access this page</div>;
  }

  const filteredMerchants = payFlow.selectedCategory
    ? MERCHANTS.filter(m => payFlow.selectedCategory && m.category === payFlow.selectedCategory.id)
    : [];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0D0A06]">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Progress bar */}
        {payFlow.step !== 'failed' && <StepIndicator step={payFlow.step as any} />}

        <AnimatePresence mode="wait">

          {/* ── STEP 1: Category ── */}
          {payFlow.step === 'category' && (
            <motion.div key="category"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="text-2xl font-bold text-[#E8D8B0] mb-2">What are you paying for?</h2>
              <p className="text-[#8B8070] mb-8">Select a spend category</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-section="category-selection">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button key={cat.id} onClick={() => payFlow.handleCategorySelect(cat)}
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
          {payFlow.step === 'merchant' && payFlow.selectedCategory && (
            <motion.div key="merchant"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <button onClick={() => payFlow.setStep('category')} className="text-[#8B8070] hover:text-[#E8D8B0] mb-4 text-sm">← Back</button>
              <h2 className="text-2xl font-bold text-[#E8D8B0] mb-2">Choose merchant</h2>
              <p className="text-[#8B8070] mb-8">{payFlow.selectedCategory.label} merchants with live reward offers</p>
              <div className="grid grid-cols-2 gap-3">
                {filteredMerchants.map(m => (
                  <button key={m.name} onClick={() => payFlow.handleMerchantSelect(m)}
                    className="bg-[#1A1209] border border-[#3D2E1A] hover:border-[#C5AA67] rounded-xl p-4
                      flex items-center gap-3 transition-all duration-200 hover:bg-[#261B0E] cursor-pointer">
                    <span className="text-3xl">{m.logo}</span>
                    <span className="text-[#E8D8B0] font-medium text-left">{m.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Amount ── */}
          {payFlow.step === 'amount' && payFlow.selectedMerchant && (
            <motion.div key="amount"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <button onClick={() => payFlow.setStep('merchant')} className="text-[#8B8070] hover:text-[#E8D8B0] mb-4 text-sm">← Back</button>
              <h2 className="text-2xl font-bold text-[#E8D8B0] mb-2">How much?</h2>
              <div className="flex items-center gap-3 mb-8">
                <span className="text-4xl">{payFlow.selectedMerchant.logo}</span>
                <span className="text-[#C4B8A8] text-lg">{payFlow.selectedMerchant.name}</span>
              </div>

              <div className="bg-[#1A1209] border border-[#3D2E1A] rounded-2xl p-6 mb-6">
                <label className="text-[#8B8070] text-sm mb-2 block">Amount (USD)</label>
                <div className="flex items-center gap-2">
                  <span className="text-[#8B8070] text-3xl">$</span>
                  <input
                    type="number"
                    min="0.01"
                    max="10000"
                    step="0.01"
                    value={payFlow.amount}
                    onChange={e => payFlow.setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-transparent text-[#E8D8B0] text-4xl font-bold w-full outline-none placeholder-[#6B5E52]"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2 mb-8">
                {['25', '50', '100', '200', '500'].map(v => (
                  <button key={v} onClick={() => payFlow.setAmount(v)}
                    className="flex-1 bg-[#1A1209] hover:bg-[#261B0E] border border-[#3D2E1A] text-[#C4B8A8]
                      rounded-lg py-2 text-sm transition-colors">
                    ${v}
                  </button>
                ))}
              </div>

              <button onClick={payFlow.handleAmountSubmit}
                disabled={!payFlow.amount || parseFloat(payFlow.amount) <= 0}
                className="w-full bg-[#C5AA67] hover:bg-[#A8893F] text-[#0D0A06] font-bold
                  py-4 rounded-xl transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                Analyze with AI
              </button>
            </motion.div>
          )}

          {/* ── STEP 4: Analyzing ── */}
          {payFlow.step === 'analyzing' && (
            <motion.div key="analyzing"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div data-section="card-recommendation">
                <AITerminal
                  merchant={payFlow.selectedMerchant?.name || ''}
                  category={payFlow.selectedCategory?.label || ''}
                  userId={userId}
                  cardCount={walletCards.length}
                />
              </div>
            </motion.div>
          )}

          {/* ── STEP 5: Approval (crypto wallet animation) ── */}
          {payFlow.step === 'approval' && payFlow.recommendation && (
            <motion.div key="approval"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>

              <h2 className="text-2xl font-bold text-[#E8D8B0] mb-1 text-center">Confirm Payment</h2>
              <p className="text-[#8B8070] text-center mb-8">Review your transaction</p>

              {/* Token flow animation — the crypto wallet moment */}
              <TokenFlowAnimation
                fromCard={payFlow.recommendation.bestCard}
                toMerchant={payFlow.selectedMerchant!}
                amount={parseFloat(payFlow.amount)}
              />

              {/* Recommendation card */}
              <div className="bg-[#1A1209] border border-[#C5AA67]/40 rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#E8A844]" />
                  <span className="text-[#E8A844] text-sm font-medium">AI Recommendation</span>
                  {payFlow.recommendation.offerFound && (
                    <span className="ml-auto text-xs bg-[#4ECDA4]/15 text-[#4ECDA4] px-2 py-0.5 rounded-full">
                      Live offer from {payFlow.recommendation.offerSource}
                    </span>
                  )}
                </div>
                <p className="text-[#E8D8B0] font-semibold mb-1">Use: {payFlow.recommendation.bestCard}</p>
                <p className="text-[#8B8070] text-sm">{payFlow.recommendation.reasoning}</p>
                <div className="mt-3 flex gap-4">
                  <div>
                    <p className="text-[#6B5E52] text-xs">Reward rate</p>
                    <p className="text-[#4ECDA4] font-bold">{(payFlow.recommendation.rewardRate * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-[#6B5E52] text-xs">You earn</p>
                    <p className="text-[#C5AA67] font-bold">+${payFlow.recommendation.nativeReward?.toFixed(2)} USD</p>
                  </div>
                  <div>
                    <p className="text-[#6B5E52] text-xs">Amount</p>
                    <p className="text-[#E8D8B0] font-bold">${parseFloat(payFlow.amount).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Approve / Reject buttons */}
              <div className="flex gap-3">
                <button onClick={payFlow.reset}
                  className="flex-1 border border-red-500/50 text-red-400 hover:bg-red-500/10
                    rounded-xl py-4 font-bold transition-all flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Reject
                </button>
                <button onClick={payFlow.handleApprove}
                  disabled={payFlow.isProcessing}
                  className="flex-2 flex-grow bg-[#C5AA67]
                    text-[#0D0A06] font-bold py-4 rounded-xl hover:bg-[#A8893F]
                    transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C5AA67]/25
                    disabled:opacity-40 disabled:cursor-not-allowed">
                  <CheckCircle2 className="w-5 h-5" />
                  {payFlow.isProcessing ? 'Processing...' : 'Approve Payment'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 6: Success — Arbitrage Receipt ── */}
          {payFlow.step === 'success' && (
            <ArbitrageReceipt
              merchant={payFlow.selectedMerchant?.name ?? ''}
              amount={parseFloat(payFlow.amount)}
              recommendation={payFlow.recommendation}
              txHash={payFlow.txHash}
              onReset={payFlow.reset}
              allCards={walletCards}
              categoryKey={CATEGORY_TO_EARN_KEY[payFlow.selectedCategory?.id ?? ''] ?? 'general'}
            />
          )}

          {/* ── STEP 7: Failed ── */}
          {payFlow.step === 'failed' && (
            <motion.div key="failed"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-12">
              <XCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-[#E8D8B0] mb-2">Transaction Failed</h2>
              <p className="text-[#8B8070] mb-8">Something went wrong. Please try again.</p>
              <button onClick={payFlow.reset}
                className="bg-[#261B0E] text-[#E8D8B0] font-bold py-3 px-8 rounded-xl hover:bg-[#3D2E1A]">
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
    <div className="bg-[#0D0A06] border border-[#3D2E1A] rounded-2xl p-6 mb-5">
      <div className="flex items-center justify-between gap-4">

        {/* From: Card */}
        <div className="flex-1 relative">
          {/* Winner glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#C5AA67] via-[#4ECDA4] to-[#C5AA67] rounded-xl animate-pulse opacity-60 blur-sm" />
          <div className="relative bg-[#1A1209] rounded-xl p-4 text-center border border-[#C5AA67]/40 shadow-[0_0_40px_rgba(197,170,103,0.6)]">
            <CreditCard className="w-8 h-8 text-[#C5AA67] mx-auto mb-2" />
            <p className="text-[#E8D8B0] text-xs font-medium leading-tight">{fromCard}</p>
            <p className="text-[#6B5E52] text-xs mt-1">-${amount.toFixed(2)}</p>
          </div>
        </div>

        {/* Animated token flow */}
        <div className="flex items-center gap-1 relative w-16">
          <TokenParticles />
          <ArrowRight className="w-5 h-5 text-[#6B5E52]" />
          <span className="text-[#C5AA67] text-xs font-bold text-center">
            +${amount.toFixed(2)} USD
          </span>
        </div>

        {/* To: Merchant */}
        <div className="flex-1 bg-[#1A1209] rounded-xl p-4 text-center border border-[#4ECDA4]/40 opacity-80">
          <span className="text-4xl block mb-1">{toMerchant.logo}</span>
          <p className="text-[#E8D8B0] text-xs font-medium leading-tight">{toMerchant.name}</p>
          <p className="text-[#6B5E52] text-xs mt-1">${amount.toFixed(2)}</p>
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
          className="absolute w-2 h-2 rounded-full bg-[#C5AA67]"
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
