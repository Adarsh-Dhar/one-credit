'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';

// Mock data
const mockProduct = {
  name: 'Apple MacBook Pro 14" M3 Pro',
  price: 1999.0,
  category: 'electronics',
  site: 'amazon',
  imageUrl: null,
};

const mockCards = [
  {
    key: 'chase-sapphire',
    name: 'Chase Sapphire Reserve',
    issuer: 'Chase',
    currency: 'UR Points',
    color: 'from-purple-600 to-purple-800',
    balance: 87400,
    earnRate: 1,
    rewardsEarned: 1999,
    netDollarCost: 1979.01,
    bestRedemptionCpp: 2.1,
    currentRedemptionCpp: 1.0,
    opportunityMultiplier: 2.1,
    netCost: 4157,
    rank: 1,
    reasoning: 'Although only 1x earn, your UR points are worth 2.1¢ each via Hyatt transfer — spending them here at 1¢ is a waste. But among all your cards, this still comes out lowest because of your high balance creating offset value.',
    bestAlternativeUse: 'Transfer to World of Hyatt — 2.1¢/point',
    realisticCpp: 1.8,
    conservativeCpp: 1.0,
    industryAssumedCpp: 1.0,
    basePointsEarned: 1999,
    bonusPointsEarned: 0,
    utilizationWarning: null,
    aprWarning: null,
    existingPoints: null,
    statementCreditApplied: 0,
    milestoneCreditUsd: 0,
    feeWaiverActive: false,
    feeWaiverNote: null,
    rotatingBonusApplied: false,
    opConservationPenalty: 0,
    opVelocityBonus: 0,
    foreignFeeUsd: 0,
  },
  {
    key: 'amex_gold',
    name: 'Amex Gold Card',
    issuer: 'American Express',
    currency: 'MR Points',
    color: 'from-yellow-500 to-yellow-600',
    balance: 42000,
    earnRate: 1,
    rewardsEarned: 1999,
    netDollarCost: 1983.01,
    bestRedemptionCpp: 1.8,
    currentRedemptionCpp: 1.0,
    opportunityMultiplier: 1.8,
    netCost: 5494,
    rank: 2,
    reasoning: 'MR points have a best redemption of 1.8¢ via Air France/KLM transfer. Spending here costs you that premium.',
    bestAlternativeUse: 'Transfer to Air France Flying Blue — 1.8¢/point',
    realisticCpp: 1.5,
    conservativeCpp: 1.0,
    industryAssumedCpp: 1.0,
    basePointsEarned: 1999,
    bonusPointsEarned: 0,
    utilizationWarning: null,
    aprWarning: null,
    existingPoints: null,
    statementCreditApplied: 0,
    milestoneCreditUsd: 0,
    feeWaiverActive: false,
    feeWaiverNote: null,
    rotatingBonusApplied: false,
    opConservationPenalty: 0,
    opVelocityBonus: 0,
    foreignFeeUsd: 0,
  },
  {
    key: 'citi-double-cash',
    name: 'Citi Double Cash',
    issuer: 'Citi',
    currency: 'Cash Back',
    color: 'from-slate-600 to-slate-700',
    balance: 284.5,
    earnRate: 2,
    rewardsEarned: 39.98,
    netDollarCost: 1959.02,
    bestRedemptionCpp: 1.0,
    currentRedemptionCpp: 1.0,
    opportunityMultiplier: 1.0,
    netCost: 5897,
    rank: 3,
    reasoning: 'Cash is cash — no opportunity cost penalty. But 2% on a $2k purchase still leaves you paying most of it in raw dollars.',
    bestAlternativeUse: 'Cash back — no transfer bonus available',
    realisticCpp: 1.0,
    conservativeCpp: 1.0,
    industryAssumedCpp: 1.0,
    basePointsEarned: 39.98,
    bonusPointsEarned: 0,
    utilizationWarning: null,
    aprWarning: null,
    existingPoints: null,
    statementCreditApplied: 0,
    milestoneCreditUsd: 0,
    feeWaiverActive: false,
    feeWaiverNote: null,
    rotatingBonusApplied: false,
    opConservationPenalty: 0,
    opVelocityBonus: 0,
    foreignFeeUsd: 0,
  },
  {
    key: 'apple_card',
    name: 'Apple Card',
    issuer: 'Goldman Sachs',
    currency: 'Daily Cash',
    color: 'from-slate-500 to-slate-600',
    balance: 12.3,
    earnRate: 3,
    rewardsEarned: 19.99,
    netDollarCost: 1979.01,
    bestRedemptionCpp: 1.0,
    currentRedemptionCpp: 1.0,
    opportunityMultiplier: 1.0,
    netCost: 6230,
    rank: 4,
    reasoning: 'Apple Card gives 3% at Apple.com but only 1% at Amazon. Low earn rate and no transfer bonus makes this the costliest option.',
    bestAlternativeUse: 'Use at Apple.com directly for 3% back',
    realisticCpp: 1.0,
    conservativeCpp: 1.0,
    industryAssumedCpp: 1.0,
    basePointsEarned: 19.99,
    bonusPointsEarned: 0,
    utilizationWarning: null,
    aprWarning: null,
    existingPoints: null,
    statementCreditApplied: 0,
    milestoneCreditUsd: 0,
    feeWaiverActive: false,
    feeWaiverNote: null,
    rotatingBonusApplied: false,
    opConservationPenalty: 0,
    opVelocityBonus: 0,
    foreignFeeUsd: 0,
  },
];

export default function OneCreditTxPortal() {
  const [step, setStep] = useState<'idle' | 'detected' | 'calculating' | 'results' | 'confirmed'>('idle');
  const [expandedCard, setExpandedCard] = useState<string | null>('chase-sapphire');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  // Dev state switcher
  const handleDevStateClick = (newStep: any) => {
    setStep(newStep);
    if (newStep === 'results') {
      setExpandedCard('chase-sapphire');
    }
  };

  return (
    <div className="fixed inset-0 bg-transparent pointer-events-none">
      {/* STATE 1: Idle Pill */}
      <AnimatePresence mode="wait">
        {step === 'idle' && (
          <motion.button
            key="idle"
            initial={{ x: 40 }}
            animate={{ x: 0 }}
            exit={{ x: 40 }}
            transition={{ duration: 0.3 }}
            onClick={() => setStep('detected')}
            className="fixed right-0 top-1/2 -translate-y-1/2 pointer-events-auto z-[9999]"
            whileHover={{ width: 120 }}
          >
            <motion.div
              className="w-10 h-20 bg-gradient-to-b from-purple-600 to-yellow-500 rounded-l-2xl shadow-lg shadow-purple-500/30 flex items-center justify-center cursor-pointer hover:w-32 transition-all duration-300 group"
              whileHover={{ x: -10 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-white text-lg font-bold">✦</span>
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  className="text-white text-xs font-semibold whitespace-nowrap"
                >
                  OneCredit
                </motion.span>
              </div>
            </motion.div>
          </motion.button>
        )}

        {/* STATE 2: Detected Preview */}
        {step === 'detected' && (
          <motion.div
            key="detected"
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed right-4 top-1/2 -translate-y-1/2 pointer-events-auto z-[9999] bg-slate-800/95 border border-purple-500/30 rounded-2xl p-4 w-72 backdrop-blur-sm shadow-2xl shadow-purple-500/10"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <span className="text-white text-lg">✦</span>
                <span className="text-white text-xs font-semibold">OneCredit</span>
              </div>
              <button
                onClick={() => setStep('idle')}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-slate-400 text-xs font-medium mb-1">Product</p>
                <p className="text-white text-sm font-semibold truncate">{mockProduct.name}</p>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-white text-2xl font-bold">${mockProduct.price.toFixed(2)}</p>
                <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  🛒 {mockProduct.site}
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep('calculating')}
                className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white py-2 px-4 rounded-lg font-medium text-sm transition-all shadow-lg shadow-purple-500/20"
              >
                Analyze with AI →
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* STATE 3: Calculating */}
        {step === 'calculating' && (
          <CalculatingState
            product={mockProduct}
            onComplete={() => setStep('results')}
          />
        )}

        {/* STATE 4: Results */}
        {step === 'results' && (
          <ResultsState
            product={mockProduct}
            cards={mockCards}
            expandedCard={expandedCard}
            setExpandedCard={setExpandedCard}
            onSelectCard={(card: any) => {
              setSelectedCard(card);
              setStep('confirmed');
            }}
            onDismiss={() => setStep('idle')}
          />
        )}

        {/* STATE 5: Confirmed */}
        {step === 'confirmed' && (
          <ConfirmedState
            card={mockCards.find((c) => c.key === selectedCard)}
            savings={2073}
            onDone={() => setStep('idle')}
          />
        )}
      </AnimatePresence>

      {/* DEV STATE SWITCHER */}
      {process.env.NODE_ENV === 'development' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 left-4 bg-slate-900/90 border border-purple-500/30 rounded-lg p-3 z-[10000] flex gap-2 flex-wrap max-w-xs backdrop-blur-sm"
        >
          {['idle', 'detected', 'calculating', 'results', 'confirmed'].map((s) => (
            <button
              key={s}
              onClick={() => handleDevStateClick(s)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                step === s
                  ? 'bg-gradient-to-r from-purple-600 to-yellow-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// Calculating State Component
function CalculatingState({ product, onComplete }: any) {
  const [loadingSteps, setLoadingSteps] = useState([
    { text: 'Fetching your card portfolio...', complete: false },
    { text: 'Calculating true net cost...', complete: false },
    { text: 'Evaluating opportunity costs...', complete: false },
  ]);

  useEffect(() => {
    const timings = [800, 1600, 2400];
    timings.forEach((time, idx) => {
      setTimeout(() => {
        setLoadingSteps((prev) => {
          const updated = [...prev];
          updated[idx].complete = true;
          return updated;
        });
      }, time);
    });

    const timer = setTimeout(onComplete, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed right-0 top-0 h-full w-96 bg-slate-900 border-l border-purple-500/30 pointer-events-auto z-[9999] overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-purple-600/10 to-yellow-500/10 border-b border-purple-500/30 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-white text-lg">✦</span>
          <div>
            <h2 className="text-white font-semibold">OneCredit</h2>
            <p className="text-slate-400 text-xs">Analyzing purchase...</p>
          </div>
        </div>
      </div>

      {/* Product Summary */}
      <div className="p-6 border-b border-purple-500/30">
        <div className="flex gap-3">
          <div className="text-3xl">💻</div>
          <div>
            <p className="text-white font-semibold text-sm">{product.name}</p>
            <p className="text-slate-400 text-sm">${product.price.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Loading Steps */}
      <div className="p-6 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="space-y-4"
        >
          {loadingSteps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.8 }}
              className="flex items-center gap-3"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center">
                {step.complete ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-green-400 font-bold"
                  >
                    ✓
                  </motion.span>
                ) : (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-purple-400"
                  >
                    ⟳
                  </motion.span>
                )}
              </div>
              <span className={`text-sm ${step.complete ? 'text-slate-400' : 'text-slate-300'}`}>
                {step.text}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Shimmer animation on header */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
      `}</style>
    </motion.div>
  );
}

// Results State Component
function ResultsState({
  product,
  cards,
  expandedCard,
  setExpandedCard,
  onSelectCard,
  onDismiss,
}: any) {
  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed right-0 top-0 h-full w-96 bg-slate-900 border-l border-purple-500/30 pointer-events-auto z-[9999] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-purple-500/30">
        <div className="flex items-center gap-2">
          <span className="text-white text-lg">✦</span>
          <span className="text-white font-semibold text-sm">OneCredit</span>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Product Chip */}
      <div className="px-6 pt-4 pb-2">
        <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-slate-300">
          <span>🛒</span>
          <span>{product.name}</span>
          <span>·</span>
          <span className="font-semibold">${product.price.toFixed(2)}</span>
          <span>·</span>
          <span>{product.category}</span>
        </div>
      </div>

      {/* Winner Banner */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mx-6 mt-4 p-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white"
      >
        <p className="text-sm font-bold">🏆 Best card: {cards[0].name}</p>
        <p className="text-xs text-emerald-100 mt-1">Saves 2,073 OP vs. worst option</p>
      </motion.div>

      {/* Card List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {cards.map((card: any) => (
          <CardRow
            key={card.key}
            card={card}
            isExpanded={expandedCard === card.key}
            onToggle={() =>
              setExpandedCard(expandedCard === card.key ? null : card.key)
            }
          />
        ))}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-purple-500/30 p-6 space-y-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectCard('chase-sapphire')}
          className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white py-3 px-4 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-purple-500/20"
        >
          Use Chase Sapphire Reserve →
        </motion.button>
        <p className="text-xs text-slate-400 text-center">
          Tap to highlight this card at checkout
        </p>
        <button className="w-full text-purple-400 hover:text-purple-300 text-xs font-medium transition-colors">
          Recalculate
        </button>
      </div>
    </motion.div>
  );
}

// Card Row Component
function CardRow({ card, isExpanded, onToggle }: any) {
  const rankEmoji = ['🥇', '🥈', '🥉', '4️⃣'][card.rank - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: card.rank * 0.1 }}
      className="bg-slate-800/50 border border-purple-500/20 rounded-lg overflow-hidden hover:border-purple-500/40 transition-colors"
    >
      <motion.button
        onClick={onToggle}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center gap-4">
          {/* Rank Badge */}
          <div className="flex-shrink-0 text-lg">{rankEmoji}</div>

          {/* Card Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-white font-semibold text-sm truncate">
                {card.name}
              </p>
              {card.rank === 1 && (
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">
                  Best
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs">{card.issuer}</p>
          </div>

          {/* Rewards + Range */}
          <div className="flex-shrink-0 text-right">
            <p className="text-white font-bold text-lg">
              {card.rewardsEarned.toLocaleString()} pts → ~${card.netDollarCost.toFixed(0)}–${(card.netDollarCost + 10).toFixed(0)}
            </p>
            <p className="text-slate-400 text-xs">
              {card.conservativeCpp === card.bestRedemptionCpp ? '(guaranteed)' : '(estimated)'}
            </p>
          </div>

          {/* Chevron */}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </motion.button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-purple-500/20 px-4 py-3 bg-slate-900/50 space-y-3 text-sm"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-400 text-xs">Rewards Earned</p>
                <p className="text-slate-200 font-semibold">
                  {card.rewardsEarned.toLocaleString()} {card.currency}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Net Dollar Cost</p>
                <p className="text-slate-200 font-semibold">
                  ${card.netDollarCost.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-400 text-xs">Value Here</p>
                <p className="text-slate-200 font-semibold">
                  {card.currentRedemptionCpp}¢/pt
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Best Use</p>
                <p className="text-slate-200 font-semibold">
                  {card.bestRedemptionCpp}¢/pt
                </p>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded p-2">
              <p className="text-slate-400 text-xs mb-1">Best Alternative</p>
              <p className="text-purple-300 text-xs font-medium">
                {card.bestAlternativeUse}
              </p>
            </div>

            <p className="text-slate-400 italic text-xs leading-relaxed">
              {card.reasoning}
            </p>

            <button className="w-full text-indigo-400 hover:text-indigo-300 text-xs font-medium py-2 transition-colors">
              Why is net cost higher? ⓘ
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Confirmed State Component
function ConfirmedState({ card, savings, onDone }: any) {
  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed right-0 top-0 h-full w-96 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900 border-l border-purple-500/30 pointer-events-auto z-[9999] flex flex-col items-center justify-center"
    >
      {/* Animated Checkmark */}
      <motion.svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="mb-6"
      >
        <motion.circle
          cx="40"
          cy="40"
          r="38"
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          initial={{ strokeDasharray: 238.76, strokeDashoffset: 238.76 }}
          animate={{ strokeDasharray: 238.76, strokeDashoffset: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        />
        <motion.path
          d="M 25 40 L 35 50 L 55 30"
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ strokeDasharray: 50, strokeDashoffset: 50 }}
          animate={{ strokeDasharray: 50, strokeDashoffset: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        />
      </motion.svg>

      {/* Text Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center space-y-4"
      >
        <h2 className="text-3xl font-bold text-white">Card selected!</h2>
        <p className="text-slate-300 text-sm">
          {card?.name} highlighted at checkout
        </p>

        <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-4 my-6">
          <p className="text-slate-400 text-xs mb-1">OP Savings</p>
          <p className="text-2xl font-bold text-emerald-400">{savings.toLocaleString()} OP</p>
          <p className="text-slate-400 text-xs mt-1">vs worst option</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onDone}
          className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white py-3 px-4 rounded-lg font-semibold text-sm transition-all mx-6"
        >
          Done
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
