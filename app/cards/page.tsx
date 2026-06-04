'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Sparkles, AlertTriangle, Shield, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

// ── Spending-cap config per card (issuer/category) ─────────────────────────
// These caps mirror the reward structure limits (e.g., Amex $6k grocery cap).
// In production this would come from the DB via rewards_structure.
interface SpendingCap {
  label: string;
  cap: number;
  spent: number; // placeholder — ideally from transaction history
}

function deriveSpendingCaps(card: any): SpendingCap[] {
  const caps: SpendingCap[] = [];
  const rs = card.rawCard?.rewards_structure ?? {};

  // Fixed-category caps
  (rs.fixed_categories ?? []).forEach((fc: any) => {
    if (fc.annual_cap_usd || fc.quarterly_cap_usd) {
      const capAmount = fc.annual_cap_usd ?? (fc.quarterly_cap_usd * 4);
      caps.push({
        label: fc.category,
        cap: capAmount,
        // Simulate spend at ~65–90% of cap for demo purposes
        spent: capAmount * (0.55 + Math.random() * 0.42),
      });
    }
  });

  // If no structured caps found, create a sensible default from credit limit
  if (caps.length === 0 && card.limit > 0) {
    caps.push({
      label: 'Credit Limit',
      cap: card.limit,
      spent: card.balance ?? 0,
    });
  }

  return caps;
}

// ── Circular progress ring ─────────────────────────────────────────────────
interface RingProps {
  cap: SpendingCap;
}

function SpendingRing({ cap }: RingProps) {
  const pct = Math.min(cap.spent / cap.cap, 1);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  // Color zones
  const isRed = pct >= 0.983; // $5,900+ of $6,000 → red/pulsing
  const isYellow = pct >= 0.667 && !isRed; // $4,000–$5,900 → yellow
  const strokeColor = isRed ? '#ef4444' : isYellow ? '#eab308' : '#22c55e';
  const glowColor = isRed ? 'rgba(239,68,68,0.45)' : isYellow ? 'rgba(234,179,8,0.35)' : 'rgba(34,197,94,0.3)';

  const remaining = cap.cap - cap.spent;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* SVG ring */}
      <div className="relative flex items-center justify-center">
        <svg width="110" height="110" viewBox="0 0 110 110">
          {/* Track */}
          <circle
            cx="55" cy="55" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="10"
          />
          {/* Progress */}
          <motion.circle
            cx="55" cy="55" r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            transform="rotate(-90 55 55)"
            style={{
              filter: `drop-shadow(0 0 6px ${glowColor})`,
            }}
          />
        </svg>

        {/* Pulsing ring overlay for danger state */}
        {isRed && (
          <div className="absolute inset-0 rounded-full border-2 border-red-500/40 animate-ping" style={{ animationDuration: '1.4s' }} />
        )}

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold" style={{ color: strokeColor }}>
            {(pct * 100).toFixed(0)}%
          </span>
          <span className="text-[10px] text-slate-500 leading-tight">used</span>
        </div>
      </div>

      {/* Labels */}
      <div className="text-center">
        <p className="text-xs text-slate-400 capitalize mb-0.5">{cap.label}</p>
        <p className="text-xs font-semibold text-white">
          ${Math.round(cap.spent).toLocaleString()} / ${Math.round(cap.cap).toLocaleString()}
        </p>

        {/* Warning badge */}
        {isRed && (
          <div className="mt-1.5 flex items-center gap-1 justify-center bg-red-500/15 border border-red-500/30 rounded-full px-2 py-0.5">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-[10px] font-bold text-red-400">Multiplier Cliff!</span>
          </div>
        )}
        {isYellow && !isRed && (
          <div className="mt-1.5 flex items-center gap-1 justify-center bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5">
            <AlertTriangle className="w-3 h-3 text-yellow-400" />
            <span className="text-[10px] font-medium text-yellow-400">
              ${Math.round(remaining).toLocaleString()} left
            </span>
          </div>
        )}
        {!isYellow && !isRed && (
          <div className="mt-1.5">
            <span className="text-[10px] text-green-400/80">${Math.round(remaining).toLocaleString()} remaining</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function CardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

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
        setCards(data.cards ?? []);
      })
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, [session, status]);

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
            <p className="text-slate-400">Interactive 3D cards with live spending caps</p>
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
            {cards.map((card, index) => {
              const caps = deriveSpendingCaps(card);
              return (
                <motion.div
                  key={card.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.4 }}
                  className="relative cursor-pointer group"
                  onMouseEnter={() => setHoveredCard(card.key)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div
                    className={`bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl border border-slate-600 shadow-2xl transition-all duration-500 transform preserve-3d ${
                      hoveredCard === card.key
                        ? 'scale-[1.03] rotate-y-6 shadow-purple-500/40'
                        : 'scale-100 rotate-y-0'
                    }`}
                  >
                    {/* Card Shine */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl pointer-events-none" />

                    {/* Card Content */}
                    <div className="relative z-10 p-6">
                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-1">{card.issuer}</p>
                          <h3 className="text-lg font-bold text-white leading-tight">{card.name}</h3>
                        </div>
                        <CreditCard className="w-8 h-8 text-purple-400" />
                      </div>

                      {/* Rewards balance */}
                      <div className="mb-5">
                        <p className="text-slate-400 text-sm mb-0.5">Available Rewards</p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-yellow-300 bg-clip-text text-transparent">
                          {Math.round(card.opValue || 0).toLocaleString()} OP
                        </p>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {card.currency === 'usd'
                            ? `($${((card.opValue || 0) / 100).toFixed(2)} Cash Back)`
                            : `(${Math.round(card.opValue / (card.opRate || 1)).toLocaleString()} Points)`}
                        </p>
                      </div>

                      {/* ── Spending Cap Rings ─────────────────────── */}
                      {caps.length > 0 && (
                        <div className="border-t border-slate-600/60 pt-4 mt-2">
                          <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">
                            Spending Caps
                          </p>
                          <div className={`flex gap-4 ${caps.length > 2 ? 'flex-wrap justify-center' : 'justify-around'}`}>
                            {caps.slice(0, 3).map((cap, i) => (
                              <SpendingRing key={i} cap={cap} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── Card Benefits ─────────────────────────── */}
                      {(card.statementCredits?.length > 0 || card.portalBonuses?.length > 0 || card.protections) && (
                        <div className="border-t border-slate-600/60 pt-4 mt-2">
                          <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">
                            Card Benefits
                          </p>

                          {/* Statement Credits */}
                          {card.statementCredits?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-slate-400 mb-2">Statement Credits</p>
                              {card.statementCredits.map((credit: any, idx: number) => {
                                const used = credit.amount_redeemed || 0;
                                const remaining = credit.amount_usd - used;
                                const pct = Math.min(used / credit.amount_usd, 1);
                                return (
                                  <div key={idx} className="mb-2">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs text-white">{credit.name}</span>
                                      <span className="text-xs text-slate-400">${used.toFixed(0)} / ${credit.amount_usd.toFixed(0)}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct * 100}%` }}
                                        transition={{ duration: 0.8, delay: 0.3 }}
                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                                      />
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{credit.reset_period} reset • ${remaining.toFixed(0)} remaining</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Portal Bonuses */}
                          {card.portalBonuses?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-slate-400 mb-2">Portal Bonuses</p>
                              <div className="flex flex-wrap gap-2">
                                {card.portalBonuses.map((bonus: any, idx: number) => (
                                  <a
                                    key={idx}
                                    href={bonus.portal_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 text-purple-300 px-2 py-1 rounded-md transition-colors"
                                  >
                                    {bonus.portal_name}
                                    <ExternalLink className="w-3 h-3" />
                                    <span className="text-slate-400">({bonus.bonus_multiplier}x)</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Purchase Protections */}
                          {card.protections && (
                            <div>
                              <p className="text-xs text-slate-400 mb-2">Purchase Protections</p>
                              <div className="flex flex-wrap gap-2">
                                {card.protections.extended_warranty && (
                                  <div className="flex items-center gap-1 text-xs bg-slate-700 text-green-400 px-2 py-1 rounded-md">
                                    <Shield className="w-3 h-3" />
                                    <span>Extended Warranty</span>
                                  </div>
                                )}
                                {card.protections.purchase_protection_days > 0 && (
                                  <div className="flex items-center gap-1 text-xs bg-slate-700 text-green-400 px-2 py-1 rounded-md">
                                    <Shield className="w-3 h-3" />
                                    <span>{card.protections.purchase_protection_days}d Protection</span>
                                  </div>
                                )}
                                {card.protections.return_protection_days > 0 && (
                                  <div className="flex items-center gap-1 text-xs bg-slate-700 text-green-400 px-2 py-1 rounded-md">
                                    <Shield className="w-3 h-3" />
                                    <span>{card.protections.return_protection_days}d Return</span>
                                  </div>
                                )}
                                {card.protections.cell_phone_protection && (
                                  <div className="flex items-center gap-1 text-xs bg-slate-700 text-green-400 px-2 py-1 rounded-md">
                                    <Shield className="w-3 h-3" />
                                    <span>Cell Phone</span>
                                  </div>
                                )}
                                {card.protections.trip_cancellation && (
                                  <div className="flex items-center gap-1 text-xs bg-slate-700 text-green-400 px-2 py-1 rounded-md">
                                    <Shield className="w-3 h-3" />
                                    <span>Trip Cancellation</span>
                                  </div>
                                )}
                                {card.protections.primary_rental_cdw && (
                                  <div className="flex items-center gap-1 text-xs bg-slate-700 text-green-400 px-2 py-1 rounded-md">
                                    <Shield className="w-3 h-3" />
                                    <span>Rental CDW</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Footer */}
                      <div className="mt-4 pt-4 border-t border-slate-600/60">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-slate-500">Rate</p>
                            <p className="text-sm font-semibold text-white">{card.redemptionRate || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Balance Owed</p>
                            <p className="text-sm font-semibold text-white">${card.balance?.toFixed(2) || '0.00'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Hover particles */}
                      {hoveredCard === card.key && (
                        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-ping" />
                          <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                          <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-purple-300 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        {!loading && cards.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-slate-800/60 to-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Spending Cap Legend</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <div>
                  <p className="font-semibold text-white">Green (0–66%)</p>
                  <p className="text-slate-400 text-xs">Full multiplier active</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                <div>
                  <p className="font-semibold text-white">Yellow (66–98%)</p>
                  <p className="text-slate-400 text-xs">Approaching cap — plan ahead</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
                <div>
                  <p className="font-semibold text-white">Red (98%+)</p>
                  <p className="text-slate-400 text-xs">Multiplier cliff! AI will route elsewhere</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .rotate-y-0 { transform: rotateY(0deg); }
        .rotate-y-6 { transform: rotateY(6deg); }
      `}</style>
    </div>
  );
}
