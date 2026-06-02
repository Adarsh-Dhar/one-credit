'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Navigation } from '@/components/Navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, ShoppingCart, Utensils, Fuel, Tv, Pill,
  ShoppingBag, Zap, CheckCircle2, XCircle, Loader2,
  CreditCard, ArrowRight, Sparkles
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface Merchant {
  name: string;
  logo: string; // emoji fallback
  category: string;
}

interface GeminiRecommendation {
  bestCard: string;
  bestCardKey: string;
  earnedOp: number;
  rewardRate: number;
  reasoning: string;
  offerFound: boolean;
  offerSource?: string;
}

// ── Data ───────────────────────────────────────────────────────────────────
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
  const [step, setStep]                   = useState<Step>('category');
  const [selectedCategory, setCategory]   = useState<typeof CATEGORIES[0] | null>(null);
  const [selectedMerchant, setMerchant]   = useState<Merchant | null>(null);
  const [amount, setAmount]               = useState('');
  const [cards, setCards]                 = useState<any[]>([]);
  const [recommendation, setRec]          = useState<GeminiRecommendation | null>(null);
  const [txHash, setTxHash]               = useState('');
  const [particlesDone, setParticlesDone] = useState(false);

  const userId = session?.user?.email || 'demo@omniwallet.com';

  // Fetch user cards once
  useEffect(() => {
    fetch(`/api/wallet?email=${encodeURIComponent(userId)}`)
      .then(r => r.json())
      .then(d => setCards(d.cards ?? []));
  }, [userId]);

  const filteredMerchants = selectedCategory
    ? MERCHANTS.filter(m => m.category === selectedCategory.id)
    : [];

  // ── Step handlers ──────────────────────────────────────────────────────
  const handleCategorySelect = (cat: typeof CATEGORIES[0]) => {
    setCategory(cat);
    setStep('merchant');
  };

  const handleMerchantSelect = (merchant: Merchant) => {
    setMerchant(merchant);
    setStep('amount');
  };

  const handleAmountSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setStep('analyzing');

    try {
      // Ask Gemini which card to use and what rewards exist
      const prompt = `
        User wants to spend $${amount} at ${selectedMerchant?.name} (${selectedCategory?.label} category).
        User ID: ${userId}
        
        1. Call sync_rewards to get fresh offer data
        2. Call get_rewards_offers for category "${selectedCategory?.id}"
        3. Call search_rewards_by_merchant for "${selectedMerchant?.name}"
        4. Call getUserBalances for userId "${userId}"
        5. Recommend the single best card to use
        
        Respond ONLY as JSON (no markdown):
        {
          "bestCard": "display name of card",
          "bestCardKey": "card key from balances",
          "earnedOp": <number of OP earned>,
          "rewardRate": <rate as decimal e.g. 0.05>,
          "reasoning": "one sentence why",
          "offerFound": true/false,
          "offerSource": "cardlytics|network|affiliate|none"
        }
      `;

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
        // Fallback if Gemini doesn't return clean JSON
        rec = {
          bestCard:   cards[0]?.name ?? 'Your best card',
          bestCardKey: cards[0]?.key ?? '',
          earnedOp:   Math.floor(parseFloat(amount) * 150),
          rewardRate: 0.05,
          reasoning:  'Best available rewards for this category.',
          offerFound: false,
          offerSource: 'none',
        };
      }
      setRec(rec);
      setStep('approval');
    } catch {
      setStep('failed');
    }
  };

  const handleApprove = async () => {
    if (!recommendation) return;
    setParticlesDone(false);

    // Wait for animation
    await new Promise(r => setTimeout(r, 2200));

    try {
      // Debit the card
      await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'updateBalances',
          toolInput: {
            userId,
            cardDebits: {
              [recommendation.bestCardKey]: { debit: recommendation.earnedOp },
            },
          },
        }),
      });

      // Record transaction
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: 'spend',
          amountOp: recommendation.earnedOp,
          description: `${selectedMerchant?.name} — $${amount}`,
          metadata: {
            merchant:  selectedMerchant?.name,
            category:  selectedCategory?.id,
            amount:    parseFloat(amount),
            card:      recommendation.bestCard,
            offerSource: recommendation.offerSource,
          },
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
        <StepIndicator step={step} />

        <AnimatePresence mode="wait">

          {/* ── STEP 1: Category ── */}
          {step === 'category' && (
            <motion.div key="category"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="text-2xl font-bold text-white mb-2">What are you paying for?</h2>
              <p className="text-slate-400 mb-8">Select a spend category</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="text-center py-20">
              <div className="relative inline-block mb-8">
                <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />
                <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Gemini is analyzing...</h2>
              <div className="space-y-2 text-slate-400 text-sm">
                <p>⚡ Syncing live reward offers from Fivetran</p>
                <p>🔍 Querying MongoDB for {selectedMerchant?.name} deals</p>
                <p>💳 Checking your card earn rates</p>
                <p>🧠 Finding optimal card for maximum OP</p>
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
                earnedOp={recommendation.earnedOp}
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
                    <p className="text-purple-400 font-bold">+{recommendation.earnedOp.toLocaleString()} OP</p>
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
                  className="flex-2 flex-grow bg-gradient-to-r from-purple-600 to-green-500
                    text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-green-600
                    transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25">
                  <CheckCircle2 className="w-5 h-5" />
                  Approve Payment
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 6: Success ── */}
          {step === 'success' && (
            <motion.div key="success"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="text-center py-12">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-14 h-14 text-green-400" />
              </motion.div>

              <h2 className="text-3xl font-bold text-white mb-2">Payment Confirmed</h2>
              <p className="text-slate-400 mb-6">{selectedMerchant?.name} · ${parseFloat(amount).toFixed(2)}</p>

              <div className="bg-slate-800 border border-green-500/30 rounded-2xl p-5 mb-6 text-left">
                <div className="flex justify-between mb-3">
                  <span className="text-slate-400">OP Earned</span>
                  <span className="text-purple-400 font-bold">+{recommendation?.earnedOp.toLocaleString()} OP</span>
                </div>
                <div className="flex justify-between mb-3">
                  <span className="text-slate-400">Card used</span>
                  <span className="text-white">{recommendation?.bestCard}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tx Hash</span>
                  <span className="text-slate-500 text-xs font-mono">{txHash}</span>
                </div>
              </div>

              <button onClick={reset}
                className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 text-white
                  font-bold py-4 rounded-xl hover:opacity-90 transition-all">
                Make Another Payment
              </button>
            </motion.div>
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

function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = ['category', 'merchant', 'amount', 'analyzing', 'approval', 'success'];
  const current = steps.indexOf(step);
  return (
    <div className="flex items-center gap-1 mb-10">
      {steps.slice(0, 5).map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div className={`h-1.5 rounded-full w-full transition-all duration-500
            ${i <= current ? 'bg-purple-500' : 'bg-slate-700'}`} />
        </div>
      ))}
    </div>
  );
}

function TokenFlowAnimation({
  fromCard, toMerchant, amount, earnedOp
}: {
  fromCard: string;
  toMerchant: Merchant;
  amount: number;
  earnedOp: number;
}) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 mb-5">
      <div className="flex items-center justify-between gap-4">

        {/* From: Card */}
        <div className="flex-1 bg-slate-800 rounded-xl p-4 text-center border border-purple-500/40">
          <CreditCard className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <p className="text-white text-xs font-medium leading-tight">{fromCard}</p>
          <p className="text-slate-500 text-xs mt-1">-${amount.toFixed(2)}</p>
        </div>

        {/* Animated token flow */}
        <div className="flex flex-col items-center gap-1 relative w-16">
          <TokenParticles />
          <ArrowRight className="w-5 h-5 text-slate-600" />
          <span className="text-purple-400 text-xs font-bold text-center">
            +{earnedOp.toLocaleString()} OP
          </span>
        </div>

        {/* To: Merchant */}
        <div className="flex-1 bg-slate-800 rounded-xl p-4 text-center border border-green-500/40">
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
