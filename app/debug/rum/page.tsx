'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Navigation } from '@/components/Navigation';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RUMDoc {
  userId: string;
  updatedAt: string;
  createdAt: string;
  // Clicks
  transferPartnerTabClicks: number;
  cardDetailExpansions: number;
  // Dwell
  dwellOnTransferGuides: number;
  dwellOnTravelCards: number;
  dwellOnCashbackCards: number;
  dwellOnLoungeDetails: number;
  dwellOnAprSection: number;
  dwellOnAnnualFeeField: number;
  // Scroll
  scrolledPastAnnualFee: boolean;
  scrollDepthMax: number;
  // Funnel
  abandonedRotatingActivation: boolean;
  backNavAfterRecommendation: boolean;
  // Business events
  cardViewCounts: Record<string, number>;
  transferPartnersClicked: string[];
  cardAddedToWallet: string | null;
  extensionFireCount: number;
  // APM
  extensionAnalyzeApiCallCount: number;
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Chip({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-mono ${
      on
        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
        : 'border-slate-700/40 bg-slate-800/40 text-slate-600'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-emerald-400' : 'bg-slate-600'}`} />
      {label}
    </span>
  );
}

function Bar({ value, max, label, color = 'purple' }: { value: number; max: number; label: string; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const colorClass = color === 'blue' ? 'from-blue-500 to-cyan-400' : 'from-purple-500 to-yellow-400';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">{value}s</span>
      </div>
      <div className="h-1.5 bg-slate-700/40 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${colorClass} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Count({ value, label, warn = false }: { value: number; label: string; warn?: boolean }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-3">
      <p className={`text-2xl font-semibold font-mono tabular-nums ${warn && value > 0 ? 'text-yellow-400' : 'text-slate-100'}`}>
        {value}
      </p>
      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{label}</p>
    </div>
  );
}

function Tags({ items, empty }: { items: string[]; empty: string }) {
  if (!items?.length) {
return <span className="text-xs text-slate-600 italic">{empty}</span>;
}
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600/30 font-mono">
          {item}
        </span>
      ))}
    </div>
  );
}

function Section({ title, children, open: defaultOpen = true }: {
  title: string; children: React.ReactNode; open?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800/80 transition-colors text-left"
      >
        <span className="text-sm font-medium text-slate-300">{title}</span>
        {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>
      {open && <div className="p-4 bg-slate-900/30 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RUMDebugPage() {
  const { data: session } = useSession();
  const [doc, setDoc] = useState<RUMDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/debug/rum');
      if (res.status === 404) {
 setDoc(null); return; 
}
      if (!res.ok) {
throw new Error(`${res.status} ${res.statusText}`);
}
      setDoc(await res.json());
      setRefreshedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
 if (session?.user?.email) {
load();
} 
}, [session?.user?.email]);

  const maxDwell = doc ? Math.max(
    doc.dwellOnTransferGuides, doc.dwellOnTravelCards, doc.dwellOnCashbackCards,
    doc.dwellOnLoungeDetails, doc.dwellOnAprSection, doc.dwellOnAnnualFeeField, 1
  ) : 1;

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400">
                DEBUG
              </span>
              <span className="text-xs text-slate-600">localhost only · blocked in production</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">RUM Signal Inspector</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">{session?.user?.email}</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-700/50 bg-slate-800/40 text-slate-300 hover:bg-slate-700/50 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* States */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-mono">
            {error}
          </div>
        )}

        {loading && !doc && (
          <p className="text-slate-500 text-sm flex items-center gap-2">
            <RefreshCw size={13} className="animate-spin" /> Loading…
          </p>
        )}

        {!loading && !doc && !error && (
          <div className="text-center py-20 text-slate-600">
            <p className="text-lg mb-2">No signals yet</p>
            <p className="text-sm">Browse the app for a few seconds — events flush every 5s.</p>
          </div>
        )}

        {/* Data */}
        {doc && (
          <div className="space-y-3">

            <p className="text-xs text-slate-600 text-right font-mono">
              first seen {new Date(doc.createdAt).toLocaleString()} ·
              last event {new Date(doc.updatedAt).toLocaleString()}
              {refreshedAt && ` · fetched ${refreshedAt.toLocaleTimeString()}`}
            </p>

            {/* Clicks */}
            <Section title="🖱  Click & interaction">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Count value={doc.transferPartnerTabClicks} label="Transfer partners tab" />
                <Count value={doc.cardDetailExpansions} label="Card detail expansions" />
              </div>
            </Section>

            {/* Dwell */}
            <Section title="⏱  Dwell time">
              <div className="space-y-3">
                <Bar value={doc.dwellOnTransferGuides}  max={maxDwell} label="Transfer partner guides" />
                <Bar value={doc.dwellOnTravelCards}     max={maxDwell} label="Travel cards section" />
                <Bar value={doc.dwellOnCashbackCards}   max={maxDwell} label="Cashback cards section" />
                <Bar value={doc.dwellOnLoungeDetails}   max={maxDwell} label="Lounge access details" />
                <Bar value={doc.dwellOnAprSection}      max={maxDwell} label="0% APR section" />
                <Bar value={doc.dwellOnAnnualFeeField}  max={maxDwell} label="Annual fee field" />
              </div>
            </Section>

            {/* Scroll */}
            <Section title="📜  Scroll depth">
              <div className="flex flex-wrap gap-2 mb-3">
                <Chip on={doc.scrolledPastAnnualFee} label="Past annual fee (≥50%)" />
              </div>
              <Bar value={doc.scrollDepthMax ?? 0} max={100} label="Max scroll depth reached" color="blue" />
            </Section>

            {/* Funnel */}
            <Section title="🔻  Funnel & abandonment">
              <div className="flex flex-wrap gap-2">
                <Chip on={doc.abandonedRotatingActivation} label="Abandoned rotating activation" />
                <Chip on={doc.backNavAfterRecommendation} label="Back-nav after recommendation" />
              </div>
            </Section>

            {/* Business events */}
            <Section title="⚡  Business events">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Card view counts (sorted by count)</p>
                  {Object.entries(doc.cardViewCounts || {})
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([cardId, count]) => (
                      <div key={cardId} className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">{cardId}</span>
                        <span className="text-white font-mono">{count as number}</span>
                      </div>
                    ))}
                  {Object.keys(doc.cardViewCounts || {}).length === 0 && (
                    <span className="text-xs text-slate-600 italic">none yet</span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Transfer partners clicked</p>
                  <Tags items={doc.transferPartnersClicked} empty="none yet" />
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">Card added to wallet</p>
                    {doc.cardAddedToWallet
                      ? <span className="text-sm font-mono text-emerald-400">{doc.cardAddedToWallet}</span>
                      : <span className="text-xs text-slate-600 italic">none yet</span>}
                  </div>
                  <Count value={doc.extensionFireCount} label="Extension fires" />
                </div>
              </div>
            </Section>

            {/* APM */}
            <Section title="🏗  APM / infrastructure" open={false}>
              <div className="grid grid-cols-2 gap-3">
                <Count value={doc.extensionAnalyzeApiCallCount} label="/api/extension/analyze calls" />
              </div>
            </Section>

            {/* Raw JSON */}
            <Section title="{ }  Raw document" open={false}>
              <pre className="text-xs text-slate-400 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
                {JSON.stringify(doc, null, 2)}
              </pre>
            </Section>

          </div>
        )}
      </div>
    </div>
  );
}
