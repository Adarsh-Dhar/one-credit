import React, { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Sparkles, Trophy, TrendingDown, AlertCircle, Loader2 } from 'lucide-react'

interface EarnAudit {
  rate: number
  per: number
  confirmedEarn: boolean
  exclusionReason: string | null
  capBreached: boolean
}

interface CardResult {
  cardKey: string
  name: string
  issuer: string
  actualPointsEarned: number
  earnAudit: EarnAudit
  bestRedemptionName: string
  bestRedemptionRatePerPoint: number
  trueRewardValueUsd: number
  industryRewardValue: number
  feeBurdenUsd: number
  floatValueUsd: number
  netCost: number
  industryCost: number
  savings: number
  effectiveDiscountPercent: number
  reasoning: string
  portalBonusApplied: boolean
  portalBonusName: string | null
  portalBonusUrl: string | null
  realisticCpp: number
  conservativeCpp: number
  industryAssumedCpp: number
  basePointsEarned: number
  bonusPointsEarned: number
  utilizationWarning: string | null
  aprWarning: string | null
  existingPoints: { balance: number; valueUsd: number; note: string } | null
  statementCreditApplied: number
  milestoneCreditUsd: number
  feeWaiverActive: boolean
  feeWaiverNote: string | null
  rotatingBonusApplied: boolean
  opConservationPenalty: number
  opVelocityBonus: number
  foreignFeeUsd: number
}

interface AnalysisResult {
  product: { name: string; price: number; url?: string }
  cards: CardResult[]
  winner: CardResult
  industryWinner: CardResult
  agentReasoning: string
  savingsVsIndustryUsd: number
  savingsVsBestAlternativeUsd: number
  userBehaviour: {
    actualAvgCppAchieved: number | null
    redemptionCount90d: number
  }
}

function buildPortalDeepLink(portalUrl: string, productUrl?: string): string {
  if (!productUrl) return portalUrl
  const encoded = encodeURIComponent(productUrl)
  // Chase, Amex, Capital One all accept a ref/destination param
  return `${portalUrl}?destination=${encoded}`
}

function isGuaranteedRate(card: CardResult): boolean {
  return card.conservativeCpp === card.bestRedemptionRatePerPoint
}

function effectiveCostRange(card: CardResult, price: number) {
  const low = price - (card.actualPointsEarned * card.bestRedemptionRatePerPoint / 100)
             + card.feeBurdenUsd - card.floatValueUsd
  const high = price - (card.actualPointsEarned * card.conservativeCpp / 100)
              + card.feeBurdenUsd - card.floatValueUsd
  return { low, high }
}

export function SidePanel() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [pendingProduct, setPendingProduct] = useState<any>(null)

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  const runAnalysis = useCallback(async (product: any) => {
    setLoading(true)
    setError(null)
    setResult(null)
    setExpandedCard(null)

    try {
      // Get userId from storage
      const stored = await new Promise<any>((resolve) =>
        chrome.storage.local.get(['userId'], resolve)
      )

      // Make direct fetch request (SidePanel has CSP meta tag allowing localhost)
      const response = await fetch(`${API_BASE}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product,
          userId: stored.userId || null,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      const data: AnalysisResult = await response.json()
      setResult(data)
      setExpandedCard(data.winner.cardKey)

      // Persist result
      chrome.storage.local.set({ selectedCards: data })
    } catch (e: any) {
      setError(e.message || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Poll for pendingAnalysis set by Popup
    const checkPending = () => {
      chrome.storage.local.get(['pendingAnalysis'], (stored) => {
        if (stored.pendingAnalysis) {
          // Consume the pending product and run analysis
          const product = stored.pendingAnalysis
          chrome.storage.local.remove('pendingAnalysis')
          setPendingProduct(product)
          runAnalysis(product)
        }
      })
    }

    checkPending()

    // Also listen for live updates
    const listener = (msg: any) => {
      if (msg.type === 'TRIGGER_ANALYSIS' && msg.product) {
        runAnalysis(msg.product)
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [runAnalysis])

  const handleCardSelect = (cardKey: string) => {
    setSelectedCard(cardKey)
    chrome.runtime.sendMessage({ type: 'CARD_SELECTED', cardKey }, () => {
      setTimeout(() => setSelectedCard(null), 2000)
    })
  }

  // For prices (MRP, industry cost) — show in $
  const fmtPrice = (n: number) =>
    '$' + n.toFixed(2)

  // For net costs — show as score
  const fmt = (n: number) =>
    '$' + n.toFixed(2)

  const pct = (n: number) => n.toFixed(1) + '%'

  // ── Loading state ──
  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center gap-4 p-6">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-slate-300 text-sm font-medium">Running OP agent…</p>
        <div className="text-center space-y-1">
          <p className="text-xs text-slate-500">Auditing earn rates</p>
          <p className="text-xs text-slate-500">Finding best redemption paths</p>
          <p className="text-xs text-slate-500">Calculating true cost</p>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center gap-3 p-6">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-slate-300 text-sm font-medium text-center">{error}</p>
        {pendingProduct && (
          <button
            onClick={() => runAnalysis(pendingProduct)}
            className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  // ── Empty state ──
  if (!result) {
    return (
      <div className="h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center gap-3 p-6">
        <Sparkles className="w-8 h-8 text-purple-400" />
        <p className="text-slate-400 text-sm text-center leading-relaxed">
          Open an Amazon product page and click<br />"Calculate best price" in the extension.
        </p>
      </div>
    )
  }

  const winner = result.winner

  return (
    <div className="h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col text-white overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-yellow-500/10 border-b border-purple-500/30 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h2 className="text-base font-bold">OP Analysis</h2>
        </div>
        <p className="text-xs text-slate-400 line-clamp-1">{result.product.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">List price: {fmtPrice(result.product.price)}</p>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Winner banner */}
        <div className="p-4 space-y-3">
          <div className="bg-purple-900/40 border border-purple-500/40 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium text-yellow-400 uppercase tracking-wide">Best card</span>
            </div>
            <div>
              <p className="font-bold text-white">{winner.name}</p>
              <p className="text-xs text-slate-400">{winner.issuer}</p>
            </div>

            {/* Zone 1: Charged today + Points earned */}
            <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Charged today</span>
                <span className="text-sm font-bold text-white">{fmtPrice(result.product.price)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">You earn</span>
                <span className="text-sm font-bold text-green-400">
                  {winner.actualPointsEarned.toLocaleString()} pts @ {winner.earnAudit.rate}x
                </span>
              </div>
            </div>

            {/* Zone 2: Points breakdown */}
            <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
              <p className="text-xs text-slate-400 font-medium">Points breakdown</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Base points</span>
                  <span>{winner.basePointsEarned.toLocaleString()} pts</span>
                </div>
                {winner.bonusPointsEarned > 0 && (
                  <div className="flex justify-between text-green-300">
                    <span>Bonus points</span>
                    <span>+{winner.bonusPointsEarned.toLocaleString()} pts</span>
                  </div>
                )}
                {(winner.rotatingBonusApplied || winner.portalBonusApplied) && (
                  <div className="flex gap-1 mt-1">
                    {winner.rotatingBonusApplied && (
                      <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded">Rotating</span>
                    )}
                    {winner.portalBonusApplied && (
                      <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-0.5 rounded">Portal</span>
                    )}
                  </div>
                )}
              </div>

              {/* CPP range */}
              <div className="mt-2 pt-2 border-t border-slate-700 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Conservative</span>
                  <span>{winner.conservativeCpp.toFixed(2)}¢/pt</span>
                </div>
                <div className="flex justify-between text-purple-300 font-medium">
                  <span>Realistic ←</span>
                  <span>{winner.realisticCpp.toFixed(2)}¢/pt</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Best case</span>
                  <span>{winner.bestRedemptionRatePerPoint.toFixed(2)}¢/pt</span>
                </div>
              </div>

              {/* Confidence signal */}
              {result.userBehaviour.redemptionCount90d > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  based on your {result.userBehaviour.redemptionCount90d} redemptions
                </p>
              )}
            </div>

            {/* Zone 3: Adjustments */}
            <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
              <p className="text-xs text-slate-400 font-medium">Adjustments</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Points value back</span>
                  <span className="text-green-400">−{fmtPrice(winner.trueRewardValueUsd)}</span>
                </div>
                {winner.feeBurdenUsd > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>
                      Fee per txn
                      {winner.feeWaiverNote && <span className="text-slate-500 ml-1">({winner.feeWaiverNote})</span>}
                    </span>
                    <span className="text-orange-400">+{fmtPrice(winner.feeBurdenUsd)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-300">
                  <span>Float value (30d)</span>
                  <span className="text-green-400">−{fmtPrice(winner.floatValueUsd)}</span>
                </div>
                {winner.statementCreditApplied > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Statement credit</span>
                    <span className="text-green-400">−{fmtPrice(winner.statementCreditApplied)}</span>
                  </div>
                )}
                {winner.milestoneCreditUsd > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Milestone credit</span>
                    <span className="text-green-400">−{fmtPrice(winner.milestoneCreditUsd)}</span>
                  </div>
                )}
                {winner.opConservationPenalty > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>OP conservation penalty</span>
                    <span className="text-red-400">+{fmtPrice(winner.opConservationPenalty)}</span>
                  </div>
                )}
                {winner.opVelocityBonus > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>OP velocity bonus</span>
                    <span className="text-green-400">−{fmtPrice(winner.opVelocityBonus)}</span>
                  </div>
                )}
                {winner.foreignFeeUsd > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Foreign transaction fee</span>
                    <span className="text-orange-400">+{fmtPrice(winner.foreignFeeUsd)}</span>
                  </div>
                )}
              </div>

              {/* Effective cost */}
              <div className="mt-2 pt-2 border-t border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Effective cost</span>
                  <span className="text-lg font-bold text-purple-300">
                    {isGuaranteedRate(winner) ? '' : '~'}{fmt(winner.netCost)}
                  </span>
                </div>
                {isGuaranteedRate(winner) && (
                  <p className="text-xs text-green-400 mt-0.5">(guaranteed)</p>
                )}
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>vs industry assumes {winner.industryAssumedCpp.toFixed(2)}¢/pt</span>
                  <span>→ {fmtPrice(winner.industryCost)}</span>
                </div>
              </div>
            </div>

            {winner.portalBonusApplied && winner.portalBonusUrl && (
              <a
                href={buildPortalDeepLink(winner.portalBonusUrl, result.product.url)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2.5"
              >
                <div>
                  <p className="text-xs font-semibold text-yellow-300">
                    Shop via {winner.portalBonusName}
                  </p>
                  <p className="text-xs text-slate-400">
                    Earn {winner.earnAudit.rate}x instead of base rate
                  </p>
                </div>
                <span className="text-yellow-400 text-xs font-bold flex-shrink-0">→ Go</span>
              </a>
            )}

            <button
              onClick={() => handleCardSelect(winner.cardKey)}
              disabled={selectedCard === winner.cardKey}
              className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 disabled:from-green-600 disabled:to-green-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-all"
            >
              {selectedCard === winner.cardKey ? '✓ Selected' : 'Use This Card'}
            </button>
          </div>

          {/* Agent reasoning */}
          {result.agentReasoning && (
            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-medium mb-1.5">Agent reasoning</p>
              <p className="text-xs text-slate-300 leading-relaxed">{result.agentReasoning}</p>
            </div>
          )}

          {/* All cards */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2 px-1">ALL CARDS RANKED</p>
            <div className="space-y-2">
              {result.cards.map((card, idx) => (
                <div
                  key={card.cardKey}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedCard(expandedCard === card.cardKey ? null : card.cardKey)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-700/30 transition-colors text-left"
                  >
                    {/* Rank badge */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      idx === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                      idx === 1 ? 'bg-slate-600/40 text-slate-300 border border-slate-500/40' :
                      'bg-slate-700/40 text-slate-500 border border-slate-600/40'
                    }`}>
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{card.name}</p>
                      <p className="text-xs text-slate-400">{card.issuer}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-white">
                        {card.actualPointsEarned.toLocaleString()} pts → {isGuaranteedRate(card) ? '' : '~'}
                        {effectiveCostRange(card, result.product.price).low.toFixed(0)}–${effectiveCostRange(card, result.product.price).high.toFixed(0)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {isGuaranteedRate(card) ? '(guaranteed)' : '(estimated)'}
                      </p>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${expandedCard === card.cardKey ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Expanded breakdown */}
                  {expandedCard === card.cardKey && (
                    <div className="border-t border-slate-700 p-3 space-y-3 bg-slate-900/40">

                      {/* Compact Zone 2: Points breakdown */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span>Base points</span>
                          <span>{card.basePointsEarned.toLocaleString()} pts</span>
                        </div>
                        {card.bonusPointsEarned > 0 && (
                          <div className="flex justify-between text-green-300">
                            <span>Bonus points</span>
                            <span>+{card.bonusPointsEarned.toLocaleString()} pts</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-700">
                          <span>Conservative</span>
                          <span>{card.conservativeCpp.toFixed(2)}¢/pt</span>
                        </div>
                        <div className="flex justify-between text-purple-300 font-medium">
                          <span>Realistic ←</span>
                          <span>{card.realisticCpp.toFixed(2)}¢/pt</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Best case</span>
                          <span>{card.bestRedemptionRatePerPoint.toFixed(2)}¢/pt</span>
                        </div>
                      </div>

                      {/* Compact Zone 3: Key adjustments */}
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span>Points value</span>
                          <span className="text-green-400">−{fmtPrice(card.trueRewardValueUsd)}</span>
                        </div>
                        {card.feeBurdenUsd > 0 && (
                          <div className="flex justify-between text-slate-300">
                            <span>Fee per txn</span>
                            <span className="text-orange-400">+{fmtPrice(card.feeBurdenUsd)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-300">
                          <span>Float value</span>
                          <span className="text-green-400">−{fmtPrice(card.floatValueUsd)}</span>
                        </div>
                        <div className="flex justify-between font-medium pt-1 border-t border-slate-700">
                          <span className="text-slate-300">Effective cost</span>
                          <span className="text-purple-300">
                            {isGuaranteedRate(card) ? '' : '~'}{fmt(card.netCost)}
                          </span>
                        </div>
                      </div>

                      {/* Reasoning */}
                      <div className="bg-slate-800/60 rounded-lg p-2.5">
                        <p className="text-xs text-slate-300 leading-relaxed">{card.reasoning}</p>
                      </div>

                      {/* Exclusion warning */}
                      {card.earnAudit.exclusionReason && (
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2.5">
                          <p className="text-xs text-red-300">⚠ {card.earnAudit.exclusionReason}</p>
                        </div>
                      )}

                      {card.portalBonusApplied && card.portalBonusUrl && (
                        <a
                          href={buildPortalDeepLink(card.portalBonusUrl, result.product.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2.5"
                        >
                          <div>
                            <p className="text-xs font-semibold text-yellow-300">
                              Shop via {card.portalBonusName}
                            </p>
                            <p className="text-xs text-slate-400">
                              Earn {card.earnAudit.rate}x instead of base rate
                            </p>
                          </div>
                          <span className="text-yellow-400 text-xs font-bold flex-shrink-0">→ Go</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleCardSelect(card.cardKey)}
                        disabled={selectedCard === card.cardKey}
                        className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 disabled:from-green-600 disabled:to-green-700 text-white py-2 rounded-lg font-medium text-xs transition-all"
                      >
                        {selectedCard === card.cardKey ? '✓ Selected' : 'Use This Card'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
