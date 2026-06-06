'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X, CheckCircle2 } from 'lucide-react';
import { useRUM, useDwellTime, useScrollDepth } from '@/hooks/useRUM';
import { useWallet } from '@/hooks/useWallet';

interface ComparisonCard {
  key: string;
  name: string;
  issuer: string;
  annualFee: number;
  earnRates: Record<string, number>;
  perks: string[];
  value: number;
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { cards } = useWallet();
  const { trackCardCompare, trackBackNavigation, trackCardView, trackTabClick, trackRageClick } = useRUM();
  const { startDwell, endDwell } = useDwellTime('cardComparison');
  const { startTracking: startScrollTracking, stopTracking: stopScrollTracking } = useScrollDepth([25, 50, 75, 90, 100]);
  const clickTimes = useRef<number[]>([]);

  const [selectedCards, setSelectedCards] = useState<ComparisonCard[]>([]);

  // Get card IDs from URL params
  const cardIds = searchParams.get('cards')?.split(',') || [];

  useEffect(() => {
    trackTabClick('transfer_partners');
    startDwell();
    startScrollTracking();

    // Load cards from URL params
    if (cardIds.length > 0) {
      const cardsToCompare = cards
        .filter(card => cardIds.includes(card.key))
        .map(card => ({
          key: card.key,
          name: card.name,
          issuer: card.issuer,
          annualFee: card.annualFee || 0,
          earnRates: card.earnRates || {},
          perks: card.perks || [],
          value: card.value || 0,
        }));
      setSelectedCards(cardsToCompare);
      
      // Track comparison
      cardsToCompare.forEach(card => {
        trackCardCompare(card.key);
        trackCardView(card.key);
      });
    }

    // Track back navigation (abandonment)
    const handlePopState = () => {
      trackBackNavigation();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      endDwell();
      stopScrollTracking();
      window.removeEventListener('popstate', handlePopState);
    };
  }, [cardIds, cards, trackCardCompare, trackBackNavigation, trackCardView, trackTabClick, startDwell, endDwell, startScrollTracking, stopScrollTracking]);

  const removeCard = (cardKey: string) => {
    trackCardView(cardKey);
    setSelectedCards(prev => prev.filter(c => c.key !== cardKey));
  };

  const handleCardClick = (cardKey: string) => {
    const now = Date.now();
    clickTimes.current = [...clickTimes.current.filter(t => now - t < 1000), now];
    if (clickTimes.current.length >= 3) {
      trackRageClick('card_comparison', `#${cardKey}`);
      clickTimes.current = [];
    }
    trackCardView(cardKey);
  };

  const handleBack = () => {
    trackBackNavigation();
    router.push('/cards');
  };

  if (selectedCards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-white mb-4">No Cards to Compare</h1>
            <p className="text-slate-400 mb-8">Select cards from the Cards page to compare them side-by-side.</p>
            <Button onClick={handleBack} className="bg-purple-600 text-white">
              Go to Cards
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Button onClick={handleBack} variant="ghost" className="text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cards
          </Button>
          <h1 className="text-4xl font-bold text-white mb-2">
            Card <span className="bg-gradient-to-r from-purple-400 to-yellow-300 bg-clip-text text-transparent">Comparison</span>
          </h1>
          <p className="text-slate-400">Compare {selectedCards.length} card(s) side-by-side</p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedCards.map((card) => (
            <div key={card.key} className="bg-slate-800 border border-slate-700 rounded-xl p-6 relative cursor-pointer" onClick={() => handleCardClick(card.key)}>
              <button
                onClick={() => removeCard(card.key)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1">{card.name}</h3>
                <p className="text-slate-400 text-sm">{card.issuer}</p>
              </div>

              {/* Annual Fee */}
              <div className="mb-4">
                <p className="text-slate-400 text-sm mb-1">Annual Fee</p>
                <p className="text-white font-bold text-lg">
                  {card.annualFee === 0 ? '$0' : `$${card.annualFee}`}
                </p>
              </div>

              {/* Current Value */}
              <div className="mb-4">
                <p className="text-slate-400 text-sm mb-1">Current Value</p>
                <p className="text-purple-400 font-bold text-lg">${Math.round(card.value).toLocaleString()}</p>
              </div>

              {/* Earn Rates */}
              <div className="mb-4">
                <p className="text-slate-400 text-sm mb-2">Earn Rates</p>
                <div className="space-y-2">
                  {Object.entries(card.earnRates).slice(0, 5).map(([category, rate]) => (
                    <div key={category} className="flex justify-between text-sm">
                      <span className="text-slate-300 capitalize">{category}</span>
                      <span className="text-white font-medium">{rate}x</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Perks */}
              <div>
                <p className="text-slate-400 text-sm mb-2">Key Perks</p>
                <div className="space-y-1">
                  {card.perks.slice(0, 3).map((perk, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Summary */}
        {selectedCards.length >= 2 && (
          <div className="mt-8 bg-gradient-to-r from-purple-600/20 to-yellow-500/20 border border-purple-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Quick Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Lowest Annual Fee</p>
                <p className="text-white font-bold">
                  ${Math.min(...selectedCards.map(c => c.annualFee))}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Highest Value</p>
                <p className="text-white font-bold">
                  ${Math.max(...selectedCards.map(c => c.value)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Best for Travel</p>
                <p className="text-white font-bold">
                  {selectedCards.reduce((best, current) => {
                    const travelRate = current.earnRates?.travel || 1;
                    const bestTravelRate = best.earnRates?.travel || 1;
                    return travelRate > bestTravelRate ? current : best;
                  }).name}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add More Cards */}
        <div className="mt-8 text-center">
          <Button
            onClick={() => router.push('/cards')}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            + Add More Cards to Compare
          </Button>
        </div>
      </main>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-slate-400">Loading comparison...</p>
    </div>}>
      <CompareContent />
    </Suspense>
  );
}
