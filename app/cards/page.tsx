'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function CardsPage() {
  const { data: session } = useSession();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    const email = session?.user?.email || 'demo@omniwallet.com';
    fetch(`/api/wallet?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => {
        setCards(data.cards ?? []);
      })
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, [session]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <div>
            <Link href="/">
              <Button variant="ghost" className="text-slate-400 hover:text-white mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">
              Your <span className="bg-gradient-to-r from-purple-400 to-yellow-300 bg-clip-text text-transparent">Card Collection</span>
            </h1>
            <p className="text-slate-400">Interactive 3D card showcase</p>
          </div>
          <div className="flex items-center gap-2 text-purple-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">Live Rates</span>
          </div>
        </div>

        {/* Animated Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 perspective-1000">
            {cards.map((card, index) => (
              <div
                key={card.key}
                className="relative h-80 cursor-pointer group"
                onMouseEnter={() => setHoveredCard(card.key)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl border border-slate-600 shadow-2xl transition-all duration-500 transform preserve-3d ${
                    hoveredCard === card.key
                      ? 'scale-110 rotate-y-12 shadow-purple-500/50'
                      : 'scale-100 rotate-y-0'
                  }`}
                >
                  {/* Card Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl pointer-events-none" />
                  
                  {/* Card Content */}
                  <div className="relative z-10 p-6 h-full flex flex-col">
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-xs font-medium text-slate-400 mb-1">{card.issuer}</p>
                        <h3 className="text-lg font-bold text-white leading-tight">{card.name}</h3>
                      </div>
                      <CreditCard className="w-8 h-8 text-purple-400" />
                    </div>

                    {/* Card Balance */}
                    <div className="flex-1 flex flex-col justify-center">
                      <p className="text-slate-400 text-sm mb-1">Available Rewards</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-yellow-300 bg-clip-text text-transparent">
                        {Math.round(card.opValue || 0).toLocaleString()} OP
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        {card.currency === 'usd' 
                          ? `($${((card.opValue || 0) / 100).toFixed(2)} Cash Back)`
                          : `(${Math.round(card.opValue / (card.opRate || 1)).toLocaleString()} Points)`
                        }
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-4 pt-4 border-t border-slate-600">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-slate-500">Rate</p>
                          <p className="text-sm font-semibold text-white">{card.redemptionRate || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Balance</p>
                          <p className="text-sm font-semibold text-white">${card.balance?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Floating Particles */}
                    {hoveredCard === card.key && (
                      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-ping" />
                        <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-purple-300 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Card */}
        {!loading && cards.length > 0 && (
          <div className="mt-16 bg-gradient-to-r from-purple-600/20 to-yellow-500/20 border border-purple-500/30 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Interactive Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-300">
              <div className="flex gap-3">
                <span className="text-purple-400 text-xl">✨</span>
                <div>
                  <p className="font-semibold text-white">3D Hover Effects</p>
                  <p className="text-sm">Cards rotate and scale on hover for depth</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 text-xl">📊</span>
                <div>
                  <p className="font-semibold text-white">Live Rates</p>
                  <p className="text-sm">Dynamic redemption rates from market data</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-purple-400 text-xl">🎯</span>
                <div>
                  <p className="font-semibold text-white">Smart Routing</p>
                  <p className="text-sm">AI optimizes transactions based on rates</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .rotate-y-0 {
          transform: rotateY(0deg);
        }
        .rotate-y-12 {
          transform: rotateY(12deg);
        }
      `}</style>
    </div>
  );
}
