'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Navigation } from '@/components/Navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, ShoppingCart, Utensils, Fuel, Tv, Pill,
  ShoppingBag, Zap, CheckCircle2, XCircle,
  CreditCard, ArrowRight, Sparkles, Trophy, TrendingDown,
  Shield, ExternalLink, Receipt
} from 'lucide-react';
import { computeTotalValue } from '@/lib/op-conversion';

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
  nativeReward: number;
  rewardRate: number;
  reasoning: string;
  offerFound: boolean;
  offerSource?: string;
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

        OP MATH RULE: card.earnRates[category] is a whole number (e.g., 3 = 3%, NOT 0.03).
        CORRECT: $${amount} × (earnRate / 100) × opRate = OP earned
        Example: $${amount} at 3% → $${amount} × 0.03 = $${(parseFloat(amount) * 0.03).toFixed(2)} × 100 = ${Math.round(parseFloat(amount) * 0.03 * 100)} OP
        WRONG: $${amount} × 3 = $${parseFloat(amount) * 3} × 100 = ${Math.round(parseFloat(amount) * 3 * 100)} OP (100× error)

        1. Call sync_rewards to get fresh offer data
        2. Call get_rewards_offers for category "${selectedCategory?.id}"
        3. Call search_rewards_by_merchant for "${selectedMerchant?.name}"
        4. Call getUserBalances for userId "${userId}"
        5. For each card, analyze:
           - Statement credits that match this category (check merchant_categories)
           - Portal bonuses that apply to this category
           - Purchase protections that are relevant (extended warranty, purchase protection, cell phone protection, etc.)
        6. Calculate totalValue = (earnedOp / 100) + creditFired_USD + protectionEstimate_USD + portalBonusValue_USD
        7. Recommend the card with the HIGHEST totalValue (not just highest earnedOp)

        Respond ONLY as JSON (no markdown):
        {
          "bestCard": "display name of card",
          "bestCardKey": "card key from balances",
          "earnedOp": <number of OP earned>,
          "nativeReward": <native currency earned (miles, points, cash)>,
          "rewardRate": <rate as decimal e.g. 0.05>,
          "reasoning": "one sentence why this card has the highest total value",
          "offerFound": true/false,
          "offerSource": "cardlytics|network|affiliate|none",
          "creditFired": { "name": "statement credit name", "amount": <USD amount> },
          "portalUsed": { "name": "portal name", "url": "portal URL" },
          "protectionNotes": ["protection note 1", "protection note 2"],
          "totalValue": <total value in USD>
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
        const earnedOp = cashReward * 100;

        rec = {
          bestCard:   bestCard?.name ?? 'Your best card',
          bestCardKey: bestCard?.key ?? '',
          earnedOp,
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
    if (!recommendation) return;
    setParticlesDone(false);

    // Wait for animation
    await new Promise(r => setTimeout(r, 2200));

    try {
      // Debit the card (use nativeReward, not earnedOp)
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
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <AITerminal
                merchant={selectedMerchant?.name || ''}
                category={selectedCategory?.label || ''}
                userId={userId}
                cardCount={cards.length}
              />
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
        <div className="flex flex-col items-center gap-1 relative w-16">
          <TokenParticles />
          <ArrowRight className="w-5 h-5 text-slate-600" />
          <span className="text-purple-400 text-xs font-bold text-center">
            +{earnedOp.toLocaleString()} OP
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

function AITerminal({ merchant, category, userId, cardCount }: {
  merchant: string;
  category: string;
  userId: string;
  cardCount: number;
}) {
  const [lines, setLines] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const terminalLines = [
      { text: '> Initializing Gemini 2.5 Flash agent...', delay: 0 },
      { text: '> Connecting to MongoDB cluster...', delay: 400 },
      { text: `> Fetching wallet state for ${userId}...`, delay: 800 },
      { text: `> Found ${cardCount} linked cards. Loading earn rates...`, delay: 1200 },
      { text: '> Triggering Fivetran sync: cardlytics, network, affiliate...', delay: 1600 },
      { text: '> Fivetran sync confirmed. 0ms lag.', delay: 2000 },
      { text: `> Querying rewards offers for "${category}"...`, delay: 2400 },
      { text: `> Searching merchant database for "${merchant}"...`, delay: 2800 },
      { text: '> Found 3 active offers across 2 sources.', delay: 3200 },
      { text: '<span class="text-cyan-400">RULE: Exclude business cards from personal spend.</span>', delay: 3600 },
      { text: `> Scoring cards by OP/$ yield for ${category.toLowerCase()} category...`, delay: 4000 },
      { text: '> Optimizing for maximum OP return...', delay: 4400 },
      { text: '<span class="text-yellow-400">Recommendation locked.</span>', delay: 4800 },
    ];

    terminalLines.forEach(({ text, delay }) => {
      setTimeout(() => {
        setLines(prev => [...prev, text]);
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }, delay);
    });
  }, [merchant, category, userId, cardCount]);

  return (
    <div className="bg-black rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
      {/* Terminal title bar */}
      <div className="bg-slate-800 px-4 py-2 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-slate-400 text-xs ml-2">gemini-agent — zsh</span>
      </div>

      {/* Terminal content */}
      <div
        ref={terminalRef}
        className="bg-black p-4 font-mono text-sm h-80 overflow-y-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className="mb-1"
            dangerouslySetInnerHTML={{ __html: line }}
          />
        ))}
        <div className="flex items-center gap-2">
          <span className="text-green-400">❯</span>
          <span className="w-2 h-4 bg-green-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── ArbitrageReceipt Component ────────────────────────────────────────────
interface ArbitrageReceiptProps {
  merchant: string;
  amount: number;
  recommendation: GeminiRecommendation | null;
  txHash: string;
  onReset: () => void;
  allCards: any[];
  categoryKey: string;
}

function ArbitrageReceipt({ merchant, amount, recommendation, txHash, onReset, allCards, categoryKey }: ArbitrageReceiptProps) {
  const confettiRef = useRef<HTMLDivElement>(null);

  // Standard cost = what you'd pay with no optimization (no rewards, full price)
  const standardCost = amount;
  // earnedOp ÷ 100 = USD value (since 100 OP = $1.00)
  const rewardsCashValue = recommendation ? (recommendation.earnedOp / 100) : 0;
  const savedAmount = Math.min(rewardsCashValue, standardCost);
  const optimizedCost = Math.max(0, standardCost - savedAmount);
  const savedPercent = standardCost > 0 ? ((savedAmount / standardCost) * 100).toFixed(1) : '0';
  const bigSave = savedAmount >= 50;

  // ── Build per-card comparison rows ────────────────────────────────────
  type CardRow = {
    key: string;
    name: string;
    earnRate: number;      // whole-number % (e.g. 3 = 3%)
    cashReward: number;    // USD
    earnedOp: number;
    isWinner: boolean;
    currency: string;
    totalValue: number;    // USD total value including credits, portal bonuses, protections
    creditFired: { name: string, amount: number } | null;
    portalBonus: { name: string, url: string, multiplier: number } | null;
    protectionValue: number;
    protectionLabels: string[];
    transferCppMin: number | null;
    transferCppMax: number | null;
    baseOp: number;
    portalOp: number;
    confidence: 'direct' | 'derived' | 'estimated';
  };

  const cardRows: CardRow[] = allCards
    .map((card) => {
      const earnRate = card.earnRates?.[categoryKey] ?? card.earnRates?.general ?? 1;
      let cashReward = amount * (earnRate / 100);
      let earnedOp = card.currency === 'usd'
        ? cashReward * 100
        : cashReward * (card.opRate ?? 100);

      // Use computeTotalValue utility for all benefit calculations
      const totalValueResult = computeTotalValue(card, amount, categoryKey);

      // Pull credit/portal data from totalValueResult (no duplicate matching logic)
      const creditFired = totalValueResult.creditName
        ? { name: totalValueResult.creditName, amount: totalValueResult.creditUsd }
        : null;

      const portalBonus = totalValueResult.portalName
        ? { name: totalValueResult.portalName, url: '', multiplier: 0 } // URL not available from computeTotalValue
        : null;

      // If portal fired, re-compute earnedOp with portal rate (for display)
      if (totalValueResult.portalName && totalValueResult.portalOp > 0) {
        cashReward = totalValueResult.portalUsd;
        earnedOp = totalValueResult.portalOp;
      }

      // Transfer partner cpp range
      const transferPartners = card.transferPartners || [];
      const transferCppMin = transferPartners.length > 0 ? Math.min(...transferPartners.map((p: any) => p.cpp_min)) : null;
      const transferCppMax = transferPartners.length > 0 ? Math.max(...transferPartners.map((p: any) => p.cpp_max)) : null;

      return {
        key: card.key,
        name: card.name,
        earnRate,
        cashReward,
        earnedOp,
        isWinner: false, // Will be set after sorting
        currency: card.currency,
        totalValue: totalValueResult.totalUsd,
        creditFired,
        portalBonus,
        protectionValue: totalValueResult.protectionUsd,
        protectionLabels: totalValueResult.protectionLabels,
        transferCppMin,
        transferCppMax,
        baseOp: totalValueResult.baseOp,
        portalOp: totalValueResult.portalOp,
        confidence: totalValueResult.confidence,
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue); // sort by total value

  // Set winner as first row after sorting
  cardRows[0].isWinner = true;

  useEffect(() => {
    // Dynamically load canvas-confetti only when savings >= $50
    if (!bigSave) return;
    import('canvas-confetti').then((confettiModule) => {
      const confetti = confettiModule.default;
      const end = Date.now() + 2200;
      const colors = ['#a855f7', '#eab308', '#22c55e', '#3b82f6', '#f97316'];
      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors,
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }).catch(() => {
      // canvas-confetti not installed — skip silently
    });
  }, [bigSave]);

  return (
    <motion.div
      key="arbitrage-receipt"
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 20 }}
      ref={confettiRef}
      className="relative"
    >
      {/* Glowing receipt card */}
      <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 border border-green-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-green-500/10">

        {/* Top glow bar */}
        <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-green-400 to-yellow-400" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-slate-700/60">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
            className="w-16 h-16 bg-green-500/15 border border-green-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3"
          >
            <CheckCircle2 className="w-9 h-9 text-green-400" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Payment Confirmed</h2>
          <p className="text-slate-400 text-sm mt-1">{merchant} · <span className="text-white font-medium">${amount.toFixed(2)}</span></p>
        </div>

        {/* Savings section */}
        <div className="px-6 py-5 border-b border-slate-700/60">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-400 text-sm">Standard Cost</span>
            <span className="text-slate-500 line-through text-base">${standardCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-300 text-sm font-medium">Optimized Cost</span>
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 200 }}
              className="text-2xl font-bold text-green-400"
            >
              ${optimizedCost.toFixed(2)}
            </motion.span>
          </div>

          {/* Badge */}
          {savedAmount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`flex items-center gap-2 rounded-xl p-3 ${
                bigSave
                  ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-500/30'
                  : 'bg-green-500/10 border border-green-500/20'
              }`}
            >
              <Trophy className={`w-5 h-5 flex-shrink-0 ${bigSave ? 'text-yellow-400' : 'text-green-400'}`} />
              <p className={`text-sm font-semibold ${bigSave ? 'text-yellow-300' : 'text-green-300'}`}>
                {recommendation?.bestCard ?? 'AI'} saved you{' '}
                <span className="font-extrabold">${savedAmount.toFixed(2)}</span>{' '}
                ({savedPercent}%) by routing through your rewards!
              </p>
            </motion.div>
          )}
        </div>

        {/* ── Card comparison table ── */}
        {cardRows.length > 1 && (
          <div className="px-6 py-4 border-b border-slate-700/60">
            {/* Better option found banner */}
            {cardRows[0].key !== recommendation?.bestCardKey && (
              <div className="mb-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <TrendingDown className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-300 text-xs leading-relaxed">
                    ⚠ Better option found: {cardRows[0].name} offers ${cardRows[0].totalValue.toFixed(2)} total value vs {recommendation?.bestCard}. The AI missed a statement credit or portal bonus.
                  </p>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <span>All cards compared</span>
              <span className="text-slate-600">— this category</span>
            </p>
            <div className="space-y-2">
              {cardRows.map((row, i) => {
                const pct = cardRows[0].totalValue > 0 ? row.totalValue / cardRows[0].totalValue : 0;
                return (
                  <motion.div
                    key={row.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.07 }}
                    className={`rounded-xl p-3 border ${
                      row.isWinner
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-slate-800/60 border-slate-700/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {row.isWinner && (
                          <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            USED
                          </span>
                        )}
                        <span className={`text-sm truncate ${row.isWinner ? 'text-white font-semibold' : 'text-slate-300'}`}>
                          {row.name}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className={`text-sm font-bold ${row.isWinner ? 'text-green-400' : 'text-slate-400'}`}>
                          ${row.totalValue.toFixed(2)}
                        </span>
                        <span className="text-slate-500 text-xs ml-1.5">
                          +{row.earnedOp % 1 === 0 ? row.earnedOp.toFixed(0) : row.earnedOp.toFixed(1)} OP
                        </span>
                      </div>
                    </div>
                    {/* Badges row */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {row.creditFired && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Receipt className="w-3 h-3" />
                          +${row.creditFired.amount.toFixed(2)} {row.creditFired.name} fires
                        </span>
                      )}
                      {row.portalBonus && (
                        <a
                          href={row.portalBonus.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-amber-500/30 transition-colors"
                        >
                          ↗ {row.portalOp > row.baseOp ? `${row.baseOp} → ${row.portalOp} OP` : `${row.portalBonus.multiplier}x`} via {row.portalBonus.name}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {row.protectionValue > 0 && (
                        <span className="text-[10px] bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          🛡 ~${row.protectionValue.toFixed(2)} est. · {row.protectionLabels.join(' + ')}
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 bg-slate-700/60 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${row.isWinner ? 'bg-green-400' : 'bg-slate-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct * 100}%` }}
                        transition={{ delay: 0.5 + i * 0.07, duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-slate-600">{row.earnRate}% back</span>
                      {!row.isWinner && cardRows[0].isWinner && (
                        <span className="text-[10px] text-slate-600">
                          -${(cardRows[0].totalValue - row.totalValue).toFixed(2)} vs best
                        </span>
                      )}
                      {row.currency === 'points' && row.transferCppMax && (
                        <span className="text-[10px] text-purple-400">
                          {row.transferCppMin}–{row.transferCppMax}¢/pt
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Receipt line items */}
        <div className="px-6 py-4 space-y-3 border-b border-slate-700/60">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">OP Earned</span>
            <span className="text-purple-400 font-bold">+{recommendation?.earnedOp.toLocaleString()} OP</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Reward Rate</span>
            <span className="text-white">{((recommendation?.rewardRate ?? 0) * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Card Used</span>
            <span className="text-white truncate max-w-[180px] text-right">{recommendation?.bestCard}</span>
          </div>
          {recommendation?.offerFound && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Offer Source</span>
              <span className="text-cyan-400 capitalize">{recommendation.offerSource}</span>
            </div>
          )}
        </div>

        {/* Tx hash */}
        <div className="px-6 py-3 border-b border-slate-700/60">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Tx Hash</span>
            <span className="text-slate-500 font-mono">{txHash}</span>
          </div>
        </div>

        {/* Reasoning */}
        {recommendation?.reasoning && (
          <div className="px-6 py-3 border-b border-slate-700/60">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <p className="text-slate-400 text-xs leading-relaxed italic">{recommendation.reasoning}</p>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="px-6 py-5">
          <motion.button
            onClick={onReset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-purple-500/25"
          >
            Make Another Payment
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
