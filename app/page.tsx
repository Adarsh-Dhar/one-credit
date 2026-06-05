'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, DollarSign, TrendingUp, X, Star } from 'lucide-react';
import Link from 'next/link';
import { CardDefinition } from '@/lib/cards';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wallet, setWallet] = useState(0);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<CardDefinition | null>(null);
  const [cardDetails, setCardDetails] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'loading') return;
    const email = session?.user?.email || 'demo@omniwallet.com';
    fetch(`/api/wallet?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => {
        setWallet(data.totalValue ?? 1500);
        setCards(data.cards ?? []);
      })
      .catch(() => setWallet(1500))
      .finally(() => setLoading(false));
  }, [session, status]);

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
            AI-powered portfolio management with Fivetran data synchronization
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
          <h2 className="text-2xl font-bold text-white mb-6">Portfolio Value</h2>
          <div className="bg-gradient-to-r from-purple-600/20 to-yellow-500/20 border border-purple-500/30 rounded-lg p-8">
            <p className="text-slate-400 text-sm mb-2">Total Balance (USD)</p>
            <div className="flex items-baseline gap-2">
              {loading ? (
                <p className="text-5xl font-bold text-purple-400">Loading...</p>
              ) : (
                <p className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-yellow-300 bg-clip-text text-transparent">
                  ${wallet.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Card Portfolio Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Your Linked Cards</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-4" />
                  <div className="h-3 bg-slate-700 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-slate-700 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((card) => {
                const maxValue = Math.max(...cards.map(c => c.value || 0));
                const isTopCard = card.value === maxValue;
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
                {/* Card Design Section */}
                {selectedCard.cardImageUrl && (
                  <div>
                    <div className="flex items-center justify-center mb-4">
                      <img
                        src={selectedCard.cardImageUrl}
                        alt={selectedCard.name}
                        className="h-48 w-auto rounded-lg shadow-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    {selectedCard.cardDescription && (
                      <p className="text-slate-300 text-sm mb-4">{selectedCard.cardDescription}</p>
                    )}
                    {selectedCard.features && selectedCard.features.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-semibold text-white mb-2">Key Features</h5>
                        <ul className="text-slate-300 text-sm space-y-1">
                          {selectedCard.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-green-400 mt-1">✓</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(selectedCard.pros && selectedCard.pros.length > 0) || (selectedCard.cons && selectedCard.cons.length > 0) && (
                      <div className="grid grid-cols-2 gap-4">
                        {selectedCard.pros && selectedCard.pros.length > 0 && (
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                            <h5 className="text-sm font-semibold text-green-400 mb-2">Pros</h5>
                            <ul className="text-slate-300 text-xs space-y-1">
                              {selectedCard.pros.map((pro, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-green-400 mt-0.5">+</span>
                                  <span>{pro}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {selectedCard.cons && selectedCard.cons.length > 0 && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <h5 className="text-sm font-semibold text-red-400 mb-2">Cons</h5>
                            <ul className="text-slate-300 text-xs space-y-1">
                              {selectedCard.cons.map((con, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-red-400 mt-0.5">-</span>
                                  <span>{con}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
                    <p className="text-slate-400 text-xs mt-1">Synthetic value</p>
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
            6-Stage Interchange Flow
          </h3>
          <div className="space-y-4 text-slate-300">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">1</div>
              <div>
                <p className="font-semibold text-white">Parse Intent</p>
                <p className="text-sm text-slate-400">Process purchase amount in USD</p>
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
                <p className="font-semibold text-white">Read Balances</p>
                <p className="text-sm text-slate-400">Fetch portfolio balances in USD</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">4</div>
              <div>
                <p className="font-semibold text-white">Score by Category</p>
                <p className="text-sm text-slate-400">Gemini ranks cards by net cost for user's purchase</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">5</div>
              <div>
                <p className="font-semibold text-white">Track Rewards</p>
                <p className="text-sm text-slate-400">Calculate earned rewards and update balances</p>
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

function TiltCard({ card, isTopCard, onClick }: {
  card: any;
  isTopCard: boolean;
  onClick: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-15, 15]);

  const shineX = useTransform(mouseX, [-0.5, 0.5], ['50%', '0%']);
  const shineY = useTransform(mouseY, [-0.5, 0.5], ['50%', '0%']);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXVal = (e.clientX - rect.left) / width - 0.5;
    const mouseYVal = (e.clientY - rect.top) / height - 0.5;
    x.set(mouseXVal);
    y.set(mouseYVal);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  // Get top 3 earn rates
  const earnRates = card.earnRates ? Object.entries(card.earnRates)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3) : [];

  return (
    <motion.div
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className="relative cursor-pointer"
    >
      {/* Gradient border for top card */}
      {isTopCard && (
        <div
          className="absolute inset-0 rounded-xl blur-md opacity-70"
          style={{
            background: 'linear-gradient(45deg, #8b5cf6, #ec4899, #f59e0b, #8b5cf6)',
            backgroundSize: '300% 300%',
            animation: 'gradientShift 3s ease infinite',
          }}
        />
      )}

      {/* Card content */}
      <motion.div
        className="relative bg-slate-800 border border-slate-700 rounded-xl p-6 overflow-hidden"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'translateZ(20px)',
        }}
      >
        {/* Specular highlight */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at var(--shine-x) var(--shine-y), rgba(255,255,255,0.15) 0%, transparent 50%)',
            '--shine-x': shineX,
            '--shine-y': shineY,
          } as any}
        />

        {/* TOP VALUE badge */}
        {isTopCard && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-600 to-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            TOP VALUE
          </div>
        )}

        {/* Card info */}
        <div className="relative z-10">
          {/* Card image */}
          {card.cardImageUrl && (
            <div className="mb-3 flex justify-center">
              <img
                src={card.cardImageUrl}
                alt={card.name}
                className="h-20 w-auto rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <p className="text-slate-400 text-xs mb-1">{card.issuer}</p>
          <p className="text-white font-bold text-lg mb-4">{card.name}</p>

          <div className="mb-4">
            <p className="text-slate-500 text-xs">Balance (USD)</p>
            <p className="text-purple-300 font-bold text-2xl">
              ${Math.round(card.value || 0).toLocaleString()}
            </p>
          </div>

          {/* Earn rate chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {earnRates.map(([category, rate]) => (
              <span
                key={category as string}
                className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded"
              >
                {category as string} {rate as number}×
              </span>
            ))}
          </div>

          {/* Primary perk */}
          <div className="text-slate-400 text-xs border-t border-slate-700 pt-3">
            {card.perks?.[0] || 'No perks listed'}
          </div>
        </div>
      </motion.div>

      {/* Inline keyframes for gradient animation */}
      <style jsx>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </motion.div>
  );
}
