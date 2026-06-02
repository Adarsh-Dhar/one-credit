'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, DollarSign, TrendingUp, X, Star } from 'lucide-react';
import Link from 'next/link';
import { CardDefinition } from '@/lib/cards';
import { useSession } from 'next-auth/react';

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
          <h2 className="text-2xl font-bold text-white mb-6">Your Cards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cards.map((card) => (
              <div
                key={card.key}
                onClick={() => handleCardClick(card)}
                className={`bg-gradient-to-br ${card.color} rounded-xl p-5 text-white shadow-lg relative overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200`}
              >
                {/* Card shine effect */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />

                <div className="relative z-10">
                  <p className="text-xs font-medium text-white/70 mb-1">{card.issuer}</p>
                  <p className="text-base font-bold leading-tight mb-4">{card.name}</p>

                  <p className="text-2xl font-bold">
                    {card.currency === 'cash'
                      ? `$${card.balance.toFixed(2)}` 
                      : card.balance.toLocaleString()}
                  </p>
                  <p className="text-xs text-white/70 mt-1">
                    {card.currency === 'cash' ? 'cashback' : card.currency}
                  </p>

                  <div className="mt-4 pt-3 border-t border-white/20 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-white/60">OP Value</p>
                      <p className="text-sm font-semibold">{Math.round(card.opValue).toLocaleString()} OP</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/60">Rate</p>
                      <p className="text-sm font-semibold">{card.opRate}x</p>
                    </div>
                  </div>

                  {/* Top perk */}
                  <p className="mt-3 text-xs text-white/60 truncate">{card.perks[0]}</p>
                </div>
              </div>
            ))}
          </div>
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
                {/* Financials */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Financial Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm">Annual Fee</p>
                      <p className="text-white font-bold">${cardDetails.financials.annual_fee}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm">Foreign Transaction Fee</p>
                      <p className="text-white font-bold">{cardDetails.financials.foreign_transaction_fee_pct}%</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm">Standard APR</p>
                      <p className="text-white font-bold">{cardDetails.financials.standard_apr}%</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm">Currency Type</p>
                      <p className="text-white font-bold">{cardDetails.currency_type}</p>
                    </div>
                  </div>
                </div>

                {/* Rewards Structure */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    Rewards Structure
                  </h4>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-2">Base Multiplier</p>
                    <p className="text-white font-bold text-2xl">{cardDetails.rewards_structure.base_multiplier}x</p>
                  </div>

                  {cardDetails.rewards_structure.fixed_categories && cardDetails.rewards_structure.fixed_categories.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-slate-400 text-sm">Bonus Categories</p>
                      {cardDetails.rewards_structure.fixed_categories.map((cat: any, idx: number) => (
                        <div key={idx} className="bg-slate-700/50 rounded-lg p-4 flex justify-between items-center">
                          <div>
                            <p className="text-white font-medium">{cat.category}</p>
                            {cat.cap_amount_usd && (
                              <p className="text-slate-400 text-xs">Cap: ${cat.cap_amount_usd.toLocaleString()} / {cat.cap_period}</p>
                            )}
                          </div>
                          <p className="text-green-400 font-bold text-xl">{cat.multiplier}x</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Statement Credits */}
                {cardDetails.benefits_and_credits.statement_credits && cardDetails.benefits_and_credits.statement_credits.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Statement Credits</h4>
                    <div className="space-y-2">
                      {cardDetails.benefits_and_credits.statement_credits.map((credit: any, idx: number) => (
                        <div key={idx} className="bg-slate-700/50 rounded-lg p-4 flex justify-between items-center">
                          <div>
                            <p className="text-white font-medium">{credit.name}</p>
                            <p className="text-slate-400 text-xs">Resets: {credit.reset_period}</p>
                          </div>
                          <p className="text-green-400 font-bold">${credit.amount_usd}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Perks */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Card Perks</h4>
                  <div className="space-y-2">
                    {cardDetails.benefits_and_credits.airline_perks && cardDetails.benefits_and_credits.airline_perks.length > 0 && (
                      <div>
                        <p className="text-slate-400 text-sm mb-2">Airline Perks</p>
                        {cardDetails.benefits_and_credits.airline_perks.map((perk: string, idx: number) => (
                          <div key={idx} className="bg-slate-700/50 rounded-lg p-3 text-white text-sm">
                            {perk}
                          </div>
                        ))}
                      </div>
                    )}
                    {cardDetails.benefits_and_credits.general_perks && cardDetails.benefits_and_credits.general_perks.length > 0 && (
                      <div>
                        <p className="text-slate-400 text-sm mb-2">General Perks</p>
                        {cardDetails.benefits_and_credits.general_perks.map((perk: string, idx: number) => (
                          <div key={idx} className="bg-slate-700/50 rounded-lg p-3 text-white text-sm">
                            {perk}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
