'use client';

import { useState, useEffect, useRef } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, DollarSign, TrendingUp, X, Star } from 'lucide-react';
import Link from 'next/link';
import { CardDefinition } from '@/lib/cards';
import { useSession } from 'next-auth/react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

export default function Dashboard() {
  const { data: session } = useSession();
  const [wallet, setWallet] = useState(0);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [cardDetails, setCardDetails] = useState<any>(null);

  useEffect(() => {
    const email = session?.user?.email || 'demo@omniwallet.com';
    fetch(`/api/wallet?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => {
        setWallet(data.totalOp ?? 150000);
        setCards(data.cards ?? []);
      })
      .catch(() => setWallet(150000))
      .finally(() => setLoading(false));
  }, [session]);

  const handleCardClick = async (card: any) => {
    setSelectedCard(card);
    try {
      const response = await fetch(`/api/fiat-cards?userId=usr_88374`);
      const data = await response.json();
      const fullCard = data.cards.find((c: any) => c.card_id === card.key);
      setCardDetails(fullCard);
    } catch (error) {
      console.error('Error fetching card details:', error);
    }
  };

  const closeCardDetails = () => {
    setSelectedCard(null);
    setCardDetails(null);
  };

  const walletUSD = (wallet / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Welcome to <span className="bg-gradient-to-r from-purple-400 to-yellow-300 bg-clip-text text-transparent">Omni-Wallet</span>
          </h1>
          <p className="text-xl text-slate-400 mb-6">
            AI-powered OP token portfolio management with Fivetran data synchronization
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link href="/test">
              <Button className="bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white border-0">
                <Sparkles className="w-4 h-4 mr-2" />
                Test Interchange
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
                <DollarSign className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </Link>
          </div>
        </div>

        {/* Wallet Overview */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">OP Token Portfolio</h2>
          <div className="bg-gradient-to-r from-purple-600/20 to-yellow-500/20 border border-purple-500/30 rounded-lg p-8">
            <p className="text-slate-400 text-sm mb-2">Total OP Balance</p>
            <div className="flex items-baseline gap-2">
              {loading ? (
                <p className="text-5xl font-bold text-purple-400">Loading...</p>
              ) : (
                <p className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-yellow-300 bg-clip-text text-transparent">
                  {wallet.toLocaleString()}
                </p>
              )}
              <span className="text-2xl text-purple-300">OP</span>
            </div>
            <p className="text-slate-300 mt-2">
              USD Equivalent: <span className="font-bold text-yellow-300">${walletUSD}</span>
            </p>
            <p className="text-slate-400 text-xs mt-4">1 OP = $0.01 USD</p>
          </div>
        </section>

        {/* Card Portfolio Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Your Linked Cards</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1,2,3].map(i => (
                <div key={i} className="h-48 rounded-2xl bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cards.map((card) => {
                const maxOp = Math.max(...cards.map(c => c.opValue ?? 0));
                const isTopCard = card.opValue === maxOp && maxOp > 0;
                return (
                  <TiltCard
                    key={card.key}
                    card={card}
                    isTopCard={isTopCard}
                    onClick={() => handleCardClick(card)}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Card Details Modal */}
        {selectedCard && cardDetails && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
              {/* Modal Header */}
              <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedCard.name}</h3>
                  <p className="text-slate-400">{selectedCard.issuer}</p>
                </div>
                <button
                  onClick={closeCardDetails}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Section A: Financial Health */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Financial Health
                  </h4>
                  
                  {/* Current Balance & Utilization */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm">Current Balance Owed</p>
                      <p className="text-white font-bold text-xl">${cardDetails.current_balance_owed?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm">Credit Limit</p>
                      <p className="text-white font-bold text-xl">${cardDetails.credit_limit?.toLocaleString() || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Credit Limit Utilization Bar */}
                  {cardDetails.credit_limit && (
                    <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                      <div className="flex justify-between mb-2">
                        <p className="text-slate-400 text-sm">Credit Limit Utilization</p>
                        <p className="text-white font-bold text-sm">
                          {((cardDetails.current_balance_owed || 0) / cardDetails.credit_limit * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-yellow-500 h-3 rounded-full transition-all"
                          style={{ width: `${Math.min(((cardDetails.current_balance_owed || 0) / cardDetails.credit_limit * 100), 100)}%` }}
                        />
                      </div>
                      <p className="text-slate-400 text-xs mt-1">
                        ${cardDetails.current_balance_owed?.toFixed(2) || '0.00'} / ${cardDetails.credit_limit?.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Active Warnings - Intro APR Expiration */}
                  {cardDetails.financials.promos?.intro_purchase_apr_expiration && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <span className="text-yellow-400 text-lg">⚠️</span>
                        <div>
                          <p className="text-yellow-300 font-semibold text-sm">0% APR Promo Expiring Soon</p>
                          <p className="text-slate-300 text-xs mt-1">
                            Expires: {new Date(cardDetails.financials.promos.intro_purchase_apr_expiration).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section B: Reward Engine */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    Reward Engine
                  </h4>

                  {/* Available Rewards */}
                  <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                    <p className="text-slate-400 text-sm mb-1">Available Rewards</p>
                    <p className="text-white font-bold text-2xl">
                      ${cardDetails.credit_token_balance?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">Synthetic OP token value</p>
                  </div>

                  {/* Points Balance for Points Cards */}
                  {cardDetails.points_balance && (
                    <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                      <p className="text-slate-400 text-sm mb-1">Points Balance</p>
                      <p className="text-white font-bold text-2xl">
                        {cardDetails.points_balance.toLocaleString()} pts
                      </p>
                      {cardDetails.points_value_cents && (
                        <p className="text-slate-400 text-xs mt-1">
                          Redeemable at {cardDetails.points_value_cents}¢/pt
                        </p>
                      )}
                    </div>
                  )}

                  {/* Unused Statement Credits */}
                  {cardDetails.benefits_and_credits.statement_credits && cardDetails.benefits_and_credits.statement_credits.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-slate-400 text-sm mb-2">Unused Statement Credits</p>
                      {cardDetails.benefits_and_credits.statement_credits.map((credit: any, idx: number) => (
                        <div 
                          key={idx} 
                          className={`rounded-lg p-4 flex justify-between items-center ${
                            credit.amount_redeemed === 0 
                              ? 'bg-green-500/10 border border-green-500/30' 
                              : 'bg-slate-700/50'
                          }`}
                        >
                          <div>
                            <p className="text-white font-medium">{credit.name}</p>
                            <p className="text-slate-400 text-xs">Resets: {credit.reset_period}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold">${credit.amount_usd}</p>
                            {credit.amount_redeemed === 0 && (
                              <p className="text-green-400 text-xs">Ready to Use</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section C: Smart Cap Trackers */}
                {cardDetails.rewards_structure.fixed_categories && cardDetails.rewards_structure.fixed_categories.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                      Smart Cap Trackers
                    </h4>
                    <div className="space-y-3">
                      {cardDetails.rewards_structure.fixed_categories.map((cat: any, idx: number) => (
                        <div key={idx} className="bg-slate-700/50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <p className="text-white font-medium">{cat.category}</p>
                              <p className="text-green-400 font-bold text-lg">{cat.multiplier}x Points</p>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-400 text-xs">Progress</p>
                              <p className="text-white font-bold text-sm">
                                ${cat.current_spend_towards_cap?.toLocaleString() || '0'} / ${cat.cap_amount_usd?.toLocaleString() || '∞'}
                              </p>
                            </div>
                          </div>
                          {cat.cap_amount_usd && (
                            <>
                              <div className="w-full bg-slate-600 rounded-full h-2 mb-2">
                                <div 
                                  className="bg-gradient-to-r from-purple-500 to-yellow-500 h-2 rounded-full transition-all"
                                  style={{ 
                                    width: `${Math.min(((cat.current_spend_towards_cap || 0) / cat.cap_amount_usd * 100), 100)}%` 
                                  }}
                                />
                              </div>
                              <p className="text-slate-400 text-xs">
                                {cat.cap_period && `Resets: ${cat.cap_period}`}
                              </p>
                              {cat.current_spend_towards_cap >= cat.cap_amount_usd && (
                                <div className="mt-2 bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                                  <p className="text-yellow-300 text-xs">
                                    ⚠️ Cap reached! Omni-Wallet will route future {cat.category.toLowerCase()} purchases to your next best card.
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Base Multiplier */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Base Multiplier</p>
                  <p className="text-white font-bold text-2xl">{cardDetails.rewards_structure.base_multiplier}x</p>
                  <p className="text-slate-400 text-xs mt-1">On all other purchases</p>
                </div>

                {/* Card Perks */}
                {cardDetails.benefits_and_credits.general_perks && cardDetails.benefits_and_credits.general_perks.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Card Perks</h4>
                    <div className="space-y-2">
                      {cardDetails.benefits_and_credits.general_perks.map((perk: string, idx: number) => (
                        <div key={idx} className="bg-slate-700/50 rounded-lg p-3 text-white text-sm">
                          {perk}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Integration Status */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-slate-400 text-sm">Fivetran</p>
            </div>
            <p className="text-xl font-bold text-white">Data Sync</p>
            <p className="text-slate-500 text-xs mt-2">Live rates & balances</p>
          </div>

          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-slate-400 text-sm">MongoDB</p>
            </div>
            <p className="text-xl font-bold text-white">Data Store</p>
            <p className="text-slate-500 text-xs mt-2">Portfolio persistence</p>
          </div>

          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-slate-400 text-sm">Gemini AI</p>
            </div>
            <p className="text-xl font-bold text-white">Optimization</p>
            <p className="text-slate-500 text-xs mt-2">Smart allocation</p>
          </div>
        </section>

        {/* Core Flow Info */}
        <section className="bg-slate-700/30 border border-slate-600 rounded-lg p-8">
          <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-yellow-300" />
            6-Stage OP Interchange Flow
          </h3>
          <div className="space-y-4 text-slate-300">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">1</div>
              <div>
                <p className="font-semibold text-white">Parse Intent</p>
                <p className="text-sm text-slate-400">Convert USD to OP (1 OP = $0.01)</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">2</div>
              <div>
                <p className="font-semibold text-white">Fivetran Syncs Rates</p>
                <p className="text-sm text-slate-400">Fresh award charts & exchange rates to MongoDB</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">3</div>
              <div>
                <p className="font-semibold text-white">Read Balances in OP</p>
                <p className="text-sm text-slate-400">Fetch portfolio, convert to OP using fresh rates</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">4</div>
              <div>
                <p className="font-semibold text-white">Score by Category</p>
                <p className="text-sm text-slate-400">Gemini ranks assets by OP/$ for user's need</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">5</div>
              <div>
                <p className="font-semibold text-white">Debit OP → Update Balances</p>
                <p className="text-sm text-slate-400">Apply per-asset debits, convert back to raw units</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">6</div>
              <div>
                <p className="font-semibold text-white">Resync After Redemption</p>
                <p className="text-sm text-slate-400">Fivetran re-syncs affected sources, auto-reconcile</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ── TiltCard ────────────────────────────────────────────────────────────────

const CARD_COLORS: Record<string, { from: string; via: string; to: string; badge: string }> = {
  travel:   { from: '#3b82f6', via: '#4f46e5', to: '#6366f1', badge: 'bg-blue-500/20 text-blue-300' },
  dining:   { from: '#f97316', via: '#ef4444', to: '#dc2626', badge: 'bg-orange-500/20 text-orange-300' },
  cashback: { from: '#10b981', via: '#14b8a6', to: '#0ea5e9', badge: 'bg-emerald-500/20 text-emerald-300' },
  fuel:     { from: '#f59e0b', via: '#f97316', to: '#ef4444', badge: 'bg-amber-500/20 text-amber-300' },
  shopping: { from: '#8b5cf6', via: '#7c3aed', to: '#6d28d9', badge: 'bg-violet-500/20 text-violet-300' },
  crypto:   { from: '#eab308', via: '#ca8a04', to: '#b45309', badge: 'bg-yellow-500/20 text-yellow-300' },
  business: { from: '#475569', via: '#334155', to: '#1e293b', badge: 'bg-slate-500/20 text-slate-300' },
  student:  { from: '#ec4899', via: '#f43f5e', to: '#e11d48', badge: 'bg-pink-500/20 text-pink-300' },
  general:  { from: '#06b6d4', via: '#0ea5e9', to: '#3b82f6', badge: 'bg-cyan-500/20 text-cyan-300' },
};

function TiltCard({ card, isTopCard, onClick }: { card: any; isTopCard: boolean; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [12, -12]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-12, 12]), { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const cardType = card.type ?? 'general';
  const colors = CARD_COLORS[cardType] ?? CARD_COLORS.general;
  const opValue = Math.round(card.opValue ?? 0);
  const earnRateEntries = Object.entries(card.earnRates ?? {})
    .filter(([k, v]) => k !== 'general' && (v as number) > 1)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3);

  return (
    <div style={{ perspective: '900px' }} className="w-full">
      {/* Pulsing gradient border ring for top-OP card */}
      <div className="relative">
        {isTopCard && (
          <div
            className="absolute -inset-[2px] rounded-2xl opacity-90 z-0"
            style={{
              background: `linear-gradient(135deg, ${colors.from}, ${colors.via}, ${colors.to}, ${colors.from})`,
              backgroundSize: '300% 300%',
              animation: 'gradientShift 3s ease infinite',
            }}
          />
        )}

        <motion.div
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={onClick}
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          className="relative z-10 cursor-pointer rounded-2xl overflow-hidden"
        >
          {/* Card face */}
          <div
            className="relative h-48 p-5 flex flex-col justify-between"
            style={{
              background: `linear-gradient(135deg, ${colors.from}cc, ${colors.via}99, ${colors.to}cc)`,
            }}
          >
            {/* Specular highlight layer — tracks opposite to tilt */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: useTransform(
                  [x, y],
                  ([lx, ly]: number[]) =>
                    `radial-gradient(circle at ${((-lx + 0.5) * 100).toFixed(1)}% ${((-ly + 0.5) * 100).toFixed(1)}%, rgba(255,255,255,0.18) 0%, transparent 60%)`
                ),
              }}
            />

            {/* Top row */}
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-white/60 text-[10px] uppercase tracking-widest font-medium">{card.issuer}</p>
                <p className="text-white font-bold text-sm leading-tight mt-0.5 max-w-[160px]">{card.name}</p>
              </div>
              {isTopCard && (
                <span className="bg-yellow-400/20 backdrop-blur-sm border border-yellow-400/30 text-yellow-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  TOP OP
                </span>
              )}
            </div>

            {/* OP Balance */}
            <div className="relative z-10">
              <p className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5">OP Balance</p>
              <p className="text-white font-bold text-2xl tracking-tight">
                {opValue.toLocaleString()} <span className="text-white/50 text-base font-normal">OP</span>
              </p>
              {/* Earn rate chips */}
              {earnRateEntries.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {earnRateEntries.map(([cat, rate]) => (
                    <span
                      key={cat}
                      className="bg-black/25 backdrop-blur-sm text-white/80 text-[9px] px-1.5 py-0.5 rounded-full capitalize"
                    >
                      {cat} {rate as number}×
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card bottom strip */}
          <div className="bg-slate-900/95 border-t border-white/5 px-5 py-3 flex justify-between items-center">
            <p className="text-slate-400 text-xs truncate max-w-[180px]">
              {card.perks?.[0] ?? 'No perks listed'}
            </p>
            <p className="text-slate-500 text-xs shrink-0 ml-2">
              {card.currency?.toUpperCase() ?? 'USD'}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Keyframe injection */}
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
