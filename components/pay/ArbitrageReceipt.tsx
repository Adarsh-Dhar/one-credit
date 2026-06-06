import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Trophy, TrendingDown, Receipt, ExternalLink, Shield, Sparkles } from 'lucide-react';
import { computeTotalValue } from '@/lib/op-conversion';
import { useRUM } from '@/hooks/useRUM';

interface GeminiRecommendation {
  bestCard: string;
  bestCardKey: string;
  nativeReward: number;
  rewardRate: number;
  reasoning: string;
  offerFound: boolean;
  offerSource: string;
}

interface ArbitrageReceiptProps {
  merchant: string;
  amount: number;
  recommendation: GeminiRecommendation | null;
  txHash: string;
  onReset: () => void;
  allCards: any[];
  categoryKey: string;
}

export function ArbitrageReceipt({ merchant, amount, recommendation, txHash, onReset, allCards, categoryKey }: ArbitrageReceiptProps) {
  const { trackRedemptionTypeView } = useRUM();
  const confettiRef = useRef<HTMLDivElement>(null);

  // Standard cost = what you'd pay with no optimization (no rewards, full price)
  const standardCost = amount;
  const rewardsCashValue = recommendation ? recommendation.nativeReward : 0;
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
    isWinner: boolean;
    currency: string;
    totalValue: number;    // USD total value including credits, portal bonuses, protections
    creditFired: { name: string, amount: number } | null;
    portalBonus: { name: string, url: string, multiplier: number } | null;
    protectionValue: number;
    protectionLabels: string[];
    transferCppMin: number | null;
    transferCppMax: number | null;
    confidence: 'direct' | 'derived' | 'estimated';
  };

  const cardRows: CardRow[] = allCards
    .map((card) => {
      const earnRate = card.earnRates?.[categoryKey] ?? card.earnRates?.general ?? 1;
      let cashReward = amount * (earnRate / 100);

      // Use computeTotalValue utility for all benefit calculations
      const totalValueResult = computeTotalValue(card, amount, categoryKey);

      // Pull credit/portal data from totalValueResult (no duplicate matching logic)
      const creditFired = totalValueResult.creditName
        ? { name: totalValueResult.creditName, amount: totalValueResult.creditUsd }
        : null;

      const portalBonus = totalValueResult.portalName
        ? { name: totalValueResult.portalName, url: '', multiplier: 0 } // URL not available from computeTotalValue
        : null;

      // If portal fired, use portal value
      if (totalValueResult.portalName && totalValueResult.portalUsd > 0) {
        cashReward = totalValueResult.portalUsd;
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
        isWinner: false, // Will be set after sorting
        currency: card.currency,
        totalValue: totalValueResult.portalUsd,
        creditFired,
        portalBonus,
        protectionValue: totalValueResult.protectionUsd,
        protectionLabels: totalValueResult.protectionLabels,
        transferCppMin,
        transferCppMax,
        confidence: totalValueResult.confidence,
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue); // sort by total value

  // Set winner as first row after sorting
  cardRows[0].isWinner = true;

  useEffect(() => {
    // Dynamically load canvas-confetti only when savings >= $50
    if (!bigSave) {
return;
}
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
        if (Date.now() < end) {
requestAnimationFrame(frame);
}
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
                          +${row.cashReward.toFixed(2)} USD
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
                          ↗ {row.portalBonus.multiplier}x via {row.portalBonus.name}
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
            <span className="text-slate-400">USD Earned</span>
            <span className="text-purple-400 font-bold">+${recommendation?.nativeReward?.toFixed(2)} USD</span>
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
            className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white font-bold py-3 rounded-xl transition-all"
          >
            Start New Payment
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
