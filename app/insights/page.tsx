'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, Brain, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { useRUM, useDwellTime, useScrollDepth } from '@/hooks/useRUM';
import type { RUMAgentResult } from '@/lib/rum-agent';

export default function InsightsPage() {
  const { data: session } = useSession();
  const { trackEvent, trackTabClick } = useRUM();
  const { startDwell, endDwell } = useDwellTime('cardRecommendation');
  const { startTracking: startScrollTracking, stopTracking: stopScrollTracking } = useScrollDepth([25, 50, 75, 90, 100]);
  const [loading, setLoading] = useState(true);
  const [personaResult, setPersonaResult] = useState<RUMAgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user?.email;

  useEffect(() => {
    trackTabClick('transfer_partners');
    trackEvent('card_recommendation_view');
    startDwell();
    startScrollTracking();

    return () => {
      endDwell();
      stopScrollTracking();
    };
  }, [trackEvent, trackTabClick, startDwell, endDwell, startScrollTracking, stopScrollTracking]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const fetchPersona = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch persona insights');
        }
        
        const data = await res.json();
        setPersonaResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPersona();
  }, [userId]);

  const handleRefresh = () => {
    if (!userId) {
      return;
    }
    
    setLoading(true);
    fetch('/api/rum/analyze', {
      method: 'POST',
    })
      .then(res => res.json())
      .then(data => {
        setPersonaResult(data);
        setError(null);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'An error occurred');
      })
      .finally(() => setLoading(false));
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#0D0A06]">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-[#E8D8B0] mb-4">Sign In Required</h1>
            <p className="text-[#8B8070]">Please sign in to view your persona insights.</p>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0A06]">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C5AA67]"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !personaResult) {
    return (
      <div className="min-h-screen bg-[#0D0A06]">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[#E8D8B0] mb-4">Unable to Load Insights</h1>
            <p className="text-[#8B8070] mb-8">{error || 'No persona data available'}</p>
            <Button onClick={handleRefresh} className="bg-[#C5AA67] text-[#0D0A06]">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const { persona } = personaResult;

  return (
    <div className="min-h-screen bg-[#0D0A06]">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#E8D8B0] mb-2">
              AI <span className="text-[#C5AA67]">Insights</span>
            </h1>
            <p className="text-[#8B8070]">Your personalized credit card persona and recommendations</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" className="border-[#3D2E1A] text-[#C4B8A8] hover:bg-[#261B0E]">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Persona Card */}
        <div className="bg-[#261B0E] border border-[#C5AA67]/30 rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-8 h-8 text-[#C5AA67]" />
            <h2 className="text-2xl font-bold text-[#E8D8B0]">Your Persona</h2>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-[#C5AA67] rounded-xl px-6 py-3">
              <p className="text-[#0D0A06] font-bold text-xl">{persona.label}</p>
            </div>
            <div>
              <p className="text-[#8B8070] text-sm">Confidence</p>
              <p className="text-[#E8D8B0] font-bold">{(persona.confidence * 100).toFixed(0)}%</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-[#E8D8B0] font-semibold mb-3">Key Signals</h3>
            <ul className="space-y-2">
              {persona.signals.map((signal, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[#C4B8A8] text-sm">
                  <Sparkles className="w-4 h-4 text-[#E8A844] mt-0.5 shrink-0" />
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#261B0E]/80 rounded-lg p-4">
              <p className="text-[#8B8070] text-sm mb-1">Filter Premium Cards</p>
              <p className="text-[#E8D8B0] font-bold">{persona.filterPremiumCards ? 'Yes' : 'No'}</p>
            </div>
            <div className="bg-[#261B0E]/80 rounded-lg p-4">
              <p className="text-[#8B8070] text-sm mb-1">Focus on Transfer Partners</p>
              <p className="text-[#E8D8B0] font-bold">{persona.focusOnTransferPartners ? 'Yes' : 'No'}</p>
            </div>
            <div className="bg-[#261B0E]/80 rounded-lg p-4">
              <p className="text-[#8B8070] text-sm mb-1">Focus on Cashback</p>
              <p className="text-[#E8D8B0] font-bold">{persona.focusOnCashback ? 'Yes' : 'No'}</p>
            </div>
            <div className="bg-[#261B0E]/80 rounded-lg p-4">
              <p className="text-[#8B8070] text-sm mb-1">Focus on Financing</p>
              <p className="text-[#E8D8B0] font-bold">{persona.focusOnFinancing ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Recommendation Card */}
        <div className="bg-[#1A1209] border border-[#3D2E1A] rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-8 h-8 text-[#4ECDA4]" />
            <h2 className="text-2xl font-bold text-[#E8D8B0]">Recommended Card Stack</h2>
          </div>

          <div className="bg-[#4ECDA4]/10 border border-[#4ECDA4]/30 rounded-xl p-6 mb-6">
            <p className="text-[#8B8070] text-sm mb-2">Primary Recommendation</p>
            <p className="text-[#E8D8B0] font-bold text-2xl mb-2">{persona.cardStackRecommendation.primary}</p>
            <p className="text-[#C4B8A8] text-sm">{persona.cardStackRecommendation.rationale}</p>
          </div>

          {persona.cardStackRecommendation.avoid.length > 0 && (
            <div>
              <p className="text-[#8B8070] text-sm mb-3">Card Types to Avoid</p>
              <div className="flex flex-wrap gap-2">
                {persona.cardStackRecommendation.avoid.map((item, idx) => (
                  <span key={idx} className="bg-red-500/10 border border-red-500/30 text-[#C0392B] px-3 py-1 rounded-full text-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Agent Reasoning */}
        <div className="bg-[#1A1209] border border-[#3D2E1A] rounded-2xl p-8">
          <h3 className="text-lg font-bold text-[#E8D8B0] mb-4">AI Reasoning</h3>
          <p className="text-[#C4B8A8] text-sm leading-relaxed">
            {personaResult.rawGeminiReasoning}
          </p>
        </div>
      </main>
    </div>
  );
}
