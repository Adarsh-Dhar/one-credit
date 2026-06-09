import { motion } from 'framer-motion';
import { TrendingDown, Receipt, ExternalLink, Shield } from 'lucide-react';
import { WalletCard } from '@/lib/types';
import { ConfettiEffect } from './ConfettiEffect';
import { ReceiptHeader } from './ReceiptHeader';
import { SavingsBadge } from './SavingsBadge';
import { ReceiptLineItems } from './ReceiptLineItems';
import { buildCardRows } from './cardRowBuilder';

const RECEIPT_CONSTANTS = {
  BIG_SAVE_THRESHOLD: 50,
  ANIMATION_STIFFNESS: 180,
  ANIMATION_DAMPING: 20,
  ANIMATION_DELAY_CARD: 0.4,
  ANIMATION_DELAY_PROGRESS: 0.5,
  ANIMATION_DURATION_PROGRESS: 0.6,
  CARD_ITEM_DELAY_MULTIPLIER: 0.07,
};

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
  allCards: WalletCard[];
  categoryKey: string;
}

export function ArbitrageReceipt({ merchant, amount, recommendation, txHash, onReset, allCards, categoryKey }: ArbitrageReceiptProps) {
  const standardCost = amount;
  const rewardsCashValue = recommendation ? recommendation.nativeReward : 0;
  const savedAmount = Math.min(rewardsCashValue, standardCost);
  const optimizedCost = Math.max(0, standardCost - savedAmount);
  const savedPercent = standardCost > 0 ? ((savedAmount / standardCost) * 100).toFixed(1) : '0';
  const bigSave = savedAmount >= RECEIPT_CONSTANTS.BIG_SAVE_THRESHOLD;

  const cardRows = buildCardRows(allCards, amount, categoryKey);

  return (
    <motion.div
      key="arbitrage-receipt"
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: RECEIPT_CONSTANTS.ANIMATION_STIFFNESS, damping: RECEIPT_CONSTANTS.ANIMATION_DAMPING }}
      className="relative"
    >
      <ConfettiEffect trigger={bigSave} />

      {/* Glowing receipt card */}
      <div className="relative bg-[#1A1209] border border-[#4ECDA4]/40 rounded-3xl overflow-hidden shadow-2xl shadow-[#4ECDA4]/10">

        {/* Top glow bar */}
        <div className="h-1 w-full bg-[#C5AA67]" />

        {/* Header */}
        <ReceiptHeader merchant={merchant} amount={amount} />

        {/* Savings section */}
        <div className="px-6 py-5 border-b border-[#3D2E1A]/60">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[#8B8070] text-sm">Standard Cost</span>
            <span className="text-[#6B5E52] line-through text-base">${standardCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[#C4B8A8] text-sm font-medium">Optimized Cost</span>
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 200 }}
              className="text-2xl font-bold text-[#4ECDA4]"
            >
              ${optimizedCost.toFixed(2)}
            </motion.span>
          </div>

          {/* Badge */}
          <SavingsBadge savedAmount={savedAmount} savedPercent={savedPercent} recommendation={recommendation} />
        </div>

        {/* ── Card comparison table ── */}
        {cardRows.length > 1 && (
          <div className="px-6 py-4 border-b border-[#3D2E1A]/60">
            {/* Better option found banner */}
            {cardRows[0].key !== recommendation?.bestCardKey && (
              <div className="mb-3 bg-[#E8A844]/10 border border-[#E8A844]/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <TrendingDown className="w-4 h-4 text-[#E8A844] shrink-0 mt-0.5" />
                  <p className="text-[#DCC98A] text-xs leading-relaxed">
                    ⚠ Better option found: {cardRows[0].name} offers ${cardRows[0].totalValue.toFixed(2)} total value vs {recommendation?.bestCard}. The AI missed a statement credit or portal bonus.
                  </p>
                </div>
              </div>
            )}
            <p className="text-xs text-[#6B5E52] mb-3 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <span>All cards compared</span>
              <span className="text-[#6B5E52]">— this category</span>
            </p>
            <div className="space-y-2">
              {cardRows.map((row, i) => {
                const pct = cardRows[0].totalValue > 0 ? row.totalValue / cardRows[0].totalValue : 0;
                return (
                  <motion.div
                    key={row.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: RECEIPT_CONSTANTS.ANIMATION_DELAY_CARD + i * RECEIPT_CONSTANTS.CARD_ITEM_DELAY_MULTIPLIER }}
                    className={`rounded-xl p-3 border ${
                      row.isWinner
                        ? 'bg-[#4ECDA4]/10 border-[#4ECDA4]/30'
                        : 'bg-[#261B0E]/80 border-[#3D2E1A]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {row.isWinner && (
                          <span className="text-[10px] font-bold bg-[#4ECDA4]/15 text-[#4ECDA4] px-1.5 py-0.5 rounded-full shrink-0">
                            USED
                          </span>
                        )}
                        <span className={`text-sm truncate ${row.isWinner ? 'text-[#E8D8B0] font-semibold' : 'text-[#C4B8A8]'}`}>
                          {row.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className={`text-sm font-bold ${row.isWinner ? 'text-[#4ECDA4]' : 'text-[#8B8070]'}`}>
                          ${row.totalValue.toFixed(2)}
                        </span>
                        <span className="text-[#6B5E52] text-xs ml-1.5">
                          +${row.cashReward.toFixed(2)} USD
                        </span>
                      </div>
                    </div>
                    {/* Badges row */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {row.creditFired && (
                        <span className="text-[10px] bg-[#4ECDA4]/15 text-[#4ECDA4] px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Receipt className="w-3 h-3" />
                          +${row.creditFired.amount.toFixed(2)} {row.creditFired.name} fires
                        </span>
                      )}
                      {row.portalBonus && (
                        <a
                          href={row.portalBonus.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] bg-[#E8A844]/15 text-[#E8A844] px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-[#E8A844]/30 transition-colors"
                        >
                          ↗ {row.portalBonus.multiplier}x via {row.portalBonus.name}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {row.protectionValue > 0 && (
                        <span className="text-[10px] bg-[#3D2E1A]/40 text-[#8B8070] px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          🛡 ~${row.protectionValue.toFixed(2)} est. · {row.protectionLabels.join(' + ')}
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 bg-[#3D2E1A]/60 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${row.isWinner ? 'bg-[#4ECDA4]' : 'bg-[#3D2E1A]'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct * 100}%` }}
                        transition={{ delay: RECEIPT_CONSTANTS.ANIMATION_DELAY_PROGRESS + i * RECEIPT_CONSTANTS.CARD_ITEM_DELAY_MULTIPLIER, duration: RECEIPT_CONSTANTS.ANIMATION_DURATION_PROGRESS, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-[#6B5E52]">{row.earnRate}% back</span>
                      {!row.isWinner && cardRows[0].isWinner && (
                        <span className="text-[10px] text-[#6B5E52]">
                          -${(cardRows[0].totalValue - row.totalValue).toFixed(2)} vs best
                        </span>
                      )}
                      {row.currency === 'points' && row.transferCppMax && (
                        <span className="text-[10px] text-[#C5AA67]">
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
        <ReceiptLineItems recommendation={recommendation} txHash={txHash} />

        {/* CTA */}
        <div className="px-6 py-5">
          <motion.button
            onClick={onReset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-[#C5AA67] hover:bg-[#A8893F] text-[#0D0A06] font-bold py-3 rounded-xl transition-all"
          >
            Start New Payment
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
