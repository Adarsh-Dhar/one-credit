'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import {
  Sparkles, CheckCircle2, AlertTriangle,
  RefreshCw, Tag, Zap, Globe
} from 'lucide-react';
import { useRUM, useDwellTime, useScrollDepth } from '@/hooks/useRUM';
import { IFiatCard } from '@/lib/models/FiatCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatementCreditRow {
  cardId: string;
  cardName: string;
  name: string;
  remaining: number;
  total: number;
  reset_period: string;
  merchant_categories: string[];
}

interface RotatingCardRow {
  cardId: string;
  cardName: string;
  is_active: boolean;
  current_quarter: string | null;
  active_categories: string[];
  multiplier: number | null;
}

interface LiveOffer {
  id: string;
  merchant: string;
  category: string;
  rate: number;
  rateLabel: string;
  source: 'cardlytics' | 'network' | 'affiliate';
  minSpend: number;
  maxReward: number;
  networks: string[];
  endDate: string;
  description: string;
}

type Tab = 'credits' | 'rotating' | 'offers';

const SOURCE_LABELS: Record<LiveOffer['source'], string> = {
  cardlytics: 'Card-Linked',
  network:    'Visa / MC',
  affiliate:  'Affiliate',
};

const SOURCE_COLORS: Record<LiveOffer['source'], string> = {
  cardlytics: 'bg-[#4ECDA4]/20 text-[#4ECDA4] border-[#4ECDA4]/30',
  network:    'bg-[#C5AA67]/20 text-[#C5AA67] border-[#C5AA67]/30',
  affiliate:  'bg-[#E8A844]/20 text-[#E8A844] border-[#E8A844]/30',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractStatementCredits(cards: IFiatCard[]): StatementCreditRow[] {
  const rows: StatementCreditRow[] = [];
  for (const card of cards) {
    for (const credit of card.benefits_and_credits?.statement_credits ?? []) {
      const remaining = credit.amount_usd - (credit.amount_redeemed ?? 0);
      if (remaining > 0) {
        rows.push({
          cardId:   card.card_id,
          cardName: card.display_name,
          name:     credit.name,
          remaining,
          total:    credit.amount_usd,
          reset_period:        credit.reset_period,
          merchant_categories: credit.merchant_categories ?? [],
        });
      }
    }
  }
  return rows.sort((a, b) => b.remaining - a.remaining);
}

function extractRotatingCategories(cards: IFiatCard[]): RotatingCardRow[] {
  return cards
    .filter(c => c.rewards_structure?.rotating_categories?.active_categories?.length)
    .map(c => ({
      cardId:            c.card_id,
      cardName:          c.display_name,
      is_active:         c.rewards_structure!.rotating_categories!.is_active,
      current_quarter:   c.rewards_structure!.rotating_categories!.current_quarter ?? null,
      active_categories: c.rewards_structure!.rotating_categories!.active_categories ?? [],
      multiplier:        c.rewards_structure!.rotating_categories!.multiplier ?? null,
    }));
}

// Normalise the three offer shapes into one flat LiveOffer[]
function normaliseOffers(data: {
  cardlytics: any[];
  network: any[];
  affiliate: any[];
}): LiveOffer[] {
  const out: LiveOffer[] = [];

  for (const o of data.cardlytics) {
    out.push({
      id:          o.offerId,
      merchant:    o.merchantName,
      category:    o.category,
      rate:        o.cashbackRate,
      rateLabel:   `${o.cashbackRate}% cashback`,
      source:      'cardlytics',
      minSpend:    o.minSpend ?? 0,
      maxReward:   o.maxCashback ?? 0,
      networks:    o.cardNetworks ?? [],
      endDate:     o.endDate,
      description: o.description,
    });
  }

  for (const o of data.network) {
    out.push({
      id:          o.offerId,
      merchant:    o.merchantName,
      category:    o.category ?? 'general',
      rate:        o.discountRate,
      rateLabel:   `${o.discountRate}% off`,
      source:      'network',
      minSpend:    o.minSpend ?? 0,
      maxReward:   o.maxDiscount ?? 0,
      networks:    [o.network],
      endDate:     o.endDate,
      description: o.description,
    });
  }

  for (const o of data.affiliate) {
    out.push({
      id:          o.dealId,
      merchant:    o.merchantName,
      category:    o.vertical ?? 'general',
      rate:        o.commissionRate,
      rateLabel:   o.commissionType === 'CPA'
        ? `$${o.commissionRate} cashback`
        : `${o.commissionRate}% commission`,
      source:      'affiliate',
      minSpend:    0,
      maxReward:   0,
      networks:    [],
      endDate:     o.endDate,
      description: o.description,
    });
  }

  return out.sort((a, b) => b.rate - a.rate);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OffersPage() {
  const { data: session } = useSession();
  const { trackTabClick, trackEvent } = useRUM();
  const { startDwell, endDwell } = useDwellTime('offers');
  const { startTracking, stopTracking } = useScrollDepth([25, 50, 75, 90, 100]);

  const [activeTab, setActiveTab]           = useState<Tab>('credits');
  const [credits, setCredits]               = useState<StatementCreditRow[]>([]);
  const [rotating, setRotating]             = useState<RotatingCardRow[]>([]);
  const [offers, setOffers]                 = useState<LiveOffer[]>([]);
  const [activatingId, setActivatingId]     = useState<string | null>(null);
  const [loadingCards, setLoadingCards]     = useState(true);
  const [loadingOffers, setLoadingOffers]   = useState(true);
  const [error, setError]                   = useState<string | null>(null);

  const userId = session?.user?.id;

  // ── RUM lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    trackTabClick('offers');
    startDwell();
    startTracking();
    return () => {
 endDwell(); stopTracking(); 
};
  }, [trackTabClick, startDwell, endDwell, startTracking, stopTracking]);

  // ── Fetch cards (credits + rotating) ──────────────────────────────────────
  const fetchCards = useCallback(async () => {
    if (!userId) {
      return;
    }
    setLoadingCards(true);
    setError(null);
    try {
      const res  = await fetch(`/api/fiat-cards?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      const cards: IFiatCard[] = data.cards ?? [];
      setCredits(extractStatementCredits(cards));
      setRotating(extractRotatingCategories(cards));
    } catch {
      setError('Failed to load card data.');
    } finally {
      setLoadingCards(false);
    }
  }, [userId]);

  // ── Fetch live offers ──────────────────────────────────────────────────────
  const fetchOffers = useCallback(async () => {
    setLoadingOffers(true);
    try {
      const res  = await fetch('/api/rewards/offers');
      const data = await res.json();
      setOffers(normaliseOffers(data));
    } catch {
      setOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
    fetchOffers();
  }, [fetchCards, fetchOffers]);

  // ── Activate rotating category ─────────────────────────────────────────────
  const handleActivate = async (cardId: string) => {
    setActivatingId(cardId);
    trackEvent('rotating_category_activation_attempt');
    try {
      const res = await fetch(`/api/fiat-cards/${encodeURIComponent(cardId)}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'activate_rotation' }),
      });
      if (res.ok) {
        setRotating(prev =>
          prev.map(r => r.cardId === cardId ? { ...r, is_active: true } : r)
        );
        trackEvent('rotating_category_activated');
      }
    } finally {
      setActivatingId(null);
    }
  };

  // ── Derived totals ─────────────────────────────────────────────────────────
  const totalRemainingCredits = credits.reduce((s, c) => s + c.remaining, 0);
  const pendingActivations    = rotating.filter(r => !r.is_active).length;

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0D0A06]">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#E8D8B0] mb-2">
            Offers & <span className="text-[#C5AA67]">Credits</span>
          </h1>
          <p className="text-[#8B8070]">
            Statement credits available to use, rotating bonuses to activate, and live merchant offers.
          </p>
        </div>

        {/* Summary banner */}
        {!loadingCards && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#261B0E] border border-[#3D2E1A] rounded-xl p-5">
              <p className="text-[#8B8070] text-sm mb-1">Credits Remaining</p>
              <p className="text-2xl font-bold text-[#4ECDA4]">${totalRemainingCredits.toFixed(0)}</p>
              <p className="text-xs text-[#6B5E52] mt-1">across {credits.length} credit(s)</p>
            </div>
            <div className="bg-[#261B0E] border border-[#3D2E1A] rounded-xl p-5">
              <p className="text-[#8B8070] text-sm mb-1">Bonuses to Activate</p>
              <p className="text-2xl font-bold text-[#E8A844]">{pendingActivations}</p>
              <p className="text-xs text-[#6B5E52] mt-1">rotating categor{pendingActivations === 1 ? 'y' : 'ies'} not yet active</p>
            </div>
            <div className="bg-[#261B0E] border border-[#3D2E1A] rounded-xl p-5">
              <p className="text-[#8B8070] text-sm mb-1">Live Offers</p>
              <p className="text-2xl font-bold text-[#C5AA67]">{loadingOffers ? '—' : offers.length}</p>
              <p className="text-xs text-[#6B5E52] mt-1">from Cardlytics, Visa/MC, Rakuten</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-[#3D2E1A]">
          {([
            { id: 'credits',  label: 'Statement Credits', icon: Tag  },
            { id: 'rotating', label: 'Rotating Bonuses',  icon: Zap  },
            { id: 'offers',   label: 'Live Offers',        icon: Globe },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { 
                setActiveTab(id); trackTabClick(id); 
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === id
                  ? 'border-[#C5AA67] text-[#E8D8B0]'
                  : 'border-transparent text-[#8B8070] hover:text-[#C4B8A8]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* ── Tab: Statement Credits ─────────────────────────────────────── */}
        {activeTab === 'credits' && (
          loadingCards ? <LoadingSkeleton /> : credits.length === 0 ? (
            <EmptyState message="No unused statement credits across your cards." />
          ) : (
            <div className="space-y-4">
              {credits.map((credit, i) => (
                <div
                  key={`${credit.cardId}-${i}`}
                  className="bg-[#1A1209] border border-[#3D2E1A] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div>
                    <p className="text-xs text-[#8B8070] mb-1">{credit.cardName}</p>
                    <p className="text-[#E8D8B0] font-semibold">{credit.name}</p>
                    {credit.merchant_categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {credit.merchant_categories.map(cat => (
                          <span key={cat} className="text-xs bg-[#261B0E] border border-[#3D2E1A] text-[#C4B8A8] px-2 py-0.5 rounded">
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="sm:text-right shrink-0">
                    <p className="text-2xl font-bold text-[#4ECDA4]">${credit.remaining.toFixed(0)}</p>
                    <p className="text-xs text-[#6B5E52]">
                      of ${credit.total} · resets {credit.reset_period.replace('_', ' ')}
                    </p>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 w-32 bg-[#3D2E1A] rounded-full overflow-hidden sm:ml-auto">
                      <div
                        className="h-full bg-[#4ECDA4] rounded-full"
                        style={{ width: `${(credit.remaining / credit.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Tab: Rotating Bonuses ──────────────────────────────────────── */}
        {activeTab === 'rotating' && (
          loadingCards ? <LoadingSkeleton /> : rotating.length === 0 ? (
            <EmptyState message="None of your cards have rotating category bonuses." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rotating.map(row => (
                <div
                  key={row.cardId}
                  className={`bg-[#1A1209] border rounded-xl p-6 transition-all ${
                    row.is_active
                      ? 'border-[#4ECDA4]/50 shadow-[0_0_20px_rgba(78,205,164,0.15)]'
                      : 'border-[#3D2E1A]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs text-[#8B8070] mb-0.5">{row.cardName}</p>
                      <p className="text-[#E8D8B0] font-semibold">
                        {row.multiplier ? `${row.multiplier}x` : 'Bonus'} Rotating Categories
                      </p>
                      {row.current_quarter && (
                        <p className="text-xs text-[#6B5E52] mt-0.5">{row.current_quarter}</p>
                      )}
                    </div>
                    {row.is_active
                      ? <CheckCircle2 className="w-6 h-6 text-[#4ECDA4] shrink-0" />
                      : <AlertTriangle className="w-6 h-6 text-[#E8A844] shrink-0" />
                    }
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {row.active_categories.map(cat => (
                      <span
                        key={cat}
                        className="text-sm bg-[#261B0E] border border-[#3D2E1A] text-[#C5AA67] px-3 py-1 rounded-full capitalize"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>

                  {row.is_active ? (
                    <div className="bg-[#4ECDA4]/10 border border-[#4ECDA4]/30 rounded-lg p-3 text-sm text-[#85DFC2] font-medium">
                      ✓ Active — bonus rewards are live on these categories
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleActivate(row.cardId)}
                      disabled={activatingId === row.cardId}
                      className="w-full bg-[#C5AA67] hover:bg-[#A8893F] text-[#0D0A06] font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                    >
                      {activatingId === row.cardId ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Activating...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />Activate Bonus</>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Tab: Live Offers ──────────────────────────────────────────── */}
        {activeTab === 'offers' && (
          loadingOffers ? <LoadingSkeleton /> : offers.length === 0 ? (
            <EmptyState message="No live offers available right now." />
          ) : (
            <div className="space-y-3">
              {offers.map(offer => (
                <div
                  key={offer.id}
                  className="bg-[#1A1209] border border-[#3D2E1A] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-[#E8D8B0] font-semibold truncate">{offer.merchant}</p>
                      <span className={`text-xs px-2 py-0.5 rounded border ${SOURCE_COLORS[offer.source]}`}>
                        {SOURCE_LABELS[offer.source]}
                      </span>
                      <span className="text-xs text-[#6B5E52] capitalize">{offer.category}</span>
                    </div>
                    <p className="text-sm text-[#8B8070] truncate">{offer.description}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-[#6B5E52]">
                      {offer.minSpend > 0 && <span>Min spend: ${offer.minSpend}</span>}
                      {offer.maxReward > 0 && <span>Max reward: ${offer.maxReward}</span>}
                      {offer.networks.length > 0 && <span>Eligible: {offer.networks.join(', ')}</span>}
                      <span>Ends {offer.endDate}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-bold text-[#C5AA67]">{offer.rateLabel}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-[#1A1209] border border-[#3D2E1A] rounded-xl h-20" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-[#8B8070]">
      <p>{message}</p>
    </div>
  );
}