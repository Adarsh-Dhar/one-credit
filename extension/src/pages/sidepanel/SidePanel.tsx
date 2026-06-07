import React, { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Sparkles, Trophy, TrendingDown, AlertCircle, Loader2 } from 'lucide-react'
import { trackEvent } from '../../rum-tracker'

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
  existingPoints: { balance: number; valueUsd: number; note: string } | null
  statementCreditApplied: number
  milestoneCreditUsd: number
  feeWaiverActive: boolean
  feeWaiverNote: string | null
  rotatingBonusApplied: boolean
  opConservationPenalty: number
  opVelocityBonus: number
  foreignFeeUsd: number
  rewardType: 'points' | 'miles' | 'cashback'
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
  const [sortMode, setSortMode] = useState<'cost' | 'points'>('cost')

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

      // Defensive: agent sometimes returns trueRewardValueUsd in cents (not divided by 100).
      // A reward can never exceed the purchase price — if it does, divide by 100.
      const price = data.product.price
      data.cards = data.cards.map(card => {
        if (card.trueRewardValueUsd > price) {
          card.trueRewardValueUsd = card.trueRewardValueUsd / 100
          card.industryRewardValue = card.industryRewardValue / 100
          // Recompute netCost and industryCost from corrected reward value
          card.netCost = price - card.trueRewardValueUsd + card.feeBurdenUsd - card.floatValueUsd + card.foreignFeeUsd
          card.industryCost = price - card.industryRewardValue + card.feeBurdenUsd - card.floatValueUsd + card.foreignFeeUsd
          card.savings = card.industryCost - card.netCost
          card.effectiveDiscountPercent = ((price - card.netCost) / price) * 100
        }
        return card
      })
      // Re-sort after correction
      data.cards.sort((a, b) => a.netCost - b.netCost)
      data.winner = data.cards[0]
      data.industryWinner = [...data.cards].sort((a, b) => a.industryCost - b.industryCost)[0]

      setResult(data)
      setExpandedCard(data.winner.cardKey)

      // Track redemption type views
      if (data.cards.some(card => card.portalBonusApplied)) {
        trackEvent({
          eventType: 'redemption_type_view',
          timestamp: Date.now(),
          data: { type: 'travel_portal' }
        })
      }
      if (data.cards.some(card => card.statementCreditApplied > 0 || card.milestoneCreditUsd > 0)) {
        trackEvent({
          eventType: 'redemption_type_view',
          timestamp: Date.now(),
          data: { type: 'statement_credit' }
        })
      }

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
  const fmtUsd = (n: number) =>
    '$' + n.toFixed(2)

  // Primary formatter — shows pts count, secondary dollar context in muted span
  const fmtPts = (pts: number, usd?: number) =>
    usd !== undefined
      ? `${pts.toLocaleString()} pts` // caller appends dollar secondary
      : `${pts.toLocaleString()} pts`

  const pct = (n: number) => n.toFixed(1) + '%'

  // Keep fmtPrice as alias for product price (stays in $)
  const fmtPrice = fmtUsd

  // ── Loading state ──
  if (loading) {
    return (
      <div className="h-screen bg-[#0D0A06] flex flex-col items-center justify-center gap-4 p-6">
        <Loader2 className="w-8 h-8 text-[#C5AA67] animate-spin" />
        <p className="text-[#C4B8A8] text-sm font-medium">Running OP agent…</p>
        <div className="text-center space-y-1">
          <p className="text-xs text-[#6B5E52]">Auditing earn rates</p>
          <p className="text-xs text-[#6B5E52]">Finding best redemption paths</p>
          <p className="text-xs text-[#6B5E52]">Calculating true cost</p>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="h-screen bg-[#0D0A06] flex flex-col items-center justify-center gap-3 p-6">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-[#C4B8A8] text-sm font-medium text-center">{error}</p>
        {pendingProduct && (
          <button
            onClick={() => runAnalysis(pendingProduct)}
            className="mt-2 px-4 py-2 bg-[#C5AA67] hover:bg-[#A8893F] text-[#0D0A06] text-xs rounded-lg"
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
      <div className="h-screen bg-[#0D0A06] flex flex-col items-center justify-center gap-3 p-6">
        <Sparkles className="w-8 h-8 text-[#C5AA67]" />
        <p className="text-[#8B8070] text-sm text-center leading-relaxed">
          Open an Amazon product page and click<br />"Calculate best price" in the extension.
        </p>
      </div>
    )
  }

  const winner = result.winner

  return (
    <div className="h-screen bg-[#0D0A06] flex flex-col text-[#E8D8B0] overflow-hidden">

      {/* Header */}
      <div className="bg-[#261B0E] border-b border-[#C5AA67]/30 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[#C5AA67]" />
          <h2 className="text-base font-bold">OP Analysis</h2>
        </div>
        <p className="text-xs text-[#8B8070] line-clamp-1">{result.product.name}</p>
        <p className="text-xs text-[#6B5E52] mt-0.5">List price: {fmtPrice(result.product.price)}</p>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Winner banner */}
        <div className="p-4 space-y-3">
          <div className="bg-[#C5AA67]/20 border border-[#C5AA67]/40 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#E8A844]" />
              <span className="text-xs font-medium text-[#E8A844] uppercase tracking-wide">Best card</span>
            </div>
            <div>
              <p className="font-bold text-[#E8D8B0]">{winner.name}</p>
              <p className="text-xs text-[#8B8070]">{winner.issuer}</p>
            </div>

            {/* Zone 1: Charged today + Points earned */}
            <div className="bg-[#261B0E]/80 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#8B8070]">Charged today</span>
                <span className="text-sm font-bold text-[#E8D8B0]">{fmtPrice(result.product.price)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#8B8070]">You earn</span>
                <span className="text-sm font-bold text-[#4ECDA4]">
                  {winner.rewardType === 'cashback'
                    ? `$${winner.trueRewardValueUsd.toFixed(2)} back (${winner.earnAudit.rate}%)`
                    : `${winner.actualPointsEarned.toLocaleString()} pts @ ${winner.earnAudit.rate}x`
                  }
                </span>
              </div>
            </div>

            {/* Zone 2: Points breakdown */}
            <div className="bg-[#261B0E]/80 rounded-lg p-3 space-y-2">
              <p className="text-xs text-[#8B8070] font-medium">Points breakdown</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[#C4B8A8]">
                  <span>Base points</span>
                  <span>{winner.basePointsEarned.toLocaleString()} pts</span>
                </div>
                {winner.bonusPointsEarned > 0 && (
                  <div className="flex justify-between text-[#4ECDA4]">
                    <span>Bonus points</span>
                    <span>+{winner.bonusPointsEarned.toLocaleString()} pts</span>
                  </div>
                )}
                {(winner.rotatingBonusApplied || winner.portalBonusApplied) && (
                  <div className="flex gap-1 mt-1">
                    {winner.rotatingBonusApplied && (
                      <span className="bg-[#C5AA67]/20 text-[#C5AA67] text-xs px-2 py-0.5 rounded">Rotating</span>
                    )}
                    {winner.portalBonusApplied && (
                      <span className="bg-[#E8A844]/20 text-[#E8A844] text-xs px-2 py-0.5 rounded">Portal</span>
                    )}
                  </div>
                )}
              </div>

              {/* CPP range */}
              <div className="mt-2 pt-2 border-t border-[#3D2E1A] space-y-1 text-xs">
                <div className="flex justify-between text-[#8B8070]">
                  <span>Conservative</span>
                  <span>{winner.conservativeCpp.toFixed(2)}¢/pt</span>
                </div>
                <div className="flex justify-between text-[#C5AA67] font-medium">
                  <span>Realistic ←</span>
                  <span>{winner.realisticCpp.toFixed(2)}¢/pt</span>
                </div>
                <div className="flex justify-between text-[#8B8070]">
                  <span>Best case</span>
                  <span>{winner.bestRedemptionRatePerPoint.toFixed(2)}¢/pt</span>
                </div>
              </div>

              {/* Confidence signal */}
              {result.userBehaviour.redemptionCount90d > 0 && (
                <p className="text-xs text-[#6B5E52] mt-1">
                  based on your {result.userBehaviour.redemptionCount90d} redemptions
                </p>
              )}
            </div>

            {/* Zone 3: Adjustments */}
            <div className="bg-[#261B0E]/80 rounded-lg p-3 space-y-2">
              <p className="text-xs text-[#8B8070] font-medium">Adjustments</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[#C4B8A8]">
                  <span>Points value back</span>
                  <span className="text-[#4ECDA4]">
                    {winner.rewardType === 'cashback'
                      ? `−${fmtUsd(winner.trueRewardValueUsd)}`
                      : <>−{winner.actualPointsEarned.toLocaleString()} pts
                          <span className="text-slate-500 ml-1 text-xs">(≈ {fmtUsd(winner.trueRewardValueUsd)})</span>
                        </>
                    }
                  </span>
                </div>
                {winner.feeBurdenUsd > 0 && (
                  <div className="flex justify-between text-[#C4B8A8]">
                    <span>
                      Fee per txn
                      {winner.feeWaiverNote && <span className="text-[#6B5E52] ml-1">({winner.feeWaiverNote})</span>}
                    </span>
                    <span className="text-[#E8A844]">+{fmtPrice(winner.feeBurdenUsd)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#C4B8A8]">
                  <span>Float value (30d)</span>
                  <span className="text-[#4ECDA4]">−{fmtPrice(winner.floatValueUsd)}</span>
                </div>
                {winner.statementCreditApplied > 0 && (
                  <div className="flex justify-between text-[#C4B8A8]">
                    <span>Statement credit</span>
                    <span className="text-[#4ECDA4]">−{fmtPrice(winner.statementCreditApplied)}</span>
                  </div>
                )}
                {winner.milestoneCreditUsd > 0 && (
                  <div className="flex justify-between text-[#C4B8A8]">
                    <span>Milestone credit</span>
                    <span className="text-[#4ECDA4]">−{fmtPrice(winner.milestoneCreditUsd)}</span>
                  </div>
                )}
                {winner.opConservationPenalty > 0 && (
                  <div className="flex justify-between text-[#C4B8A8]">
                    <span>OP conservation penalty</span>
                    <span className="text-red-400">+{fmtPrice(winner.opConservationPenalty)}</span>
                  </div>
                )}
                {winner.opVelocityBonus > 0 && (
                  <div className="flex justify-between text-[#C4B8A8]">
                    <span>OP velocity bonus</span>
                    <span className="text-[#4ECDA4]">−{fmtPrice(winner.opVelocityBonus)}</span>
                  </div>
                )}
                {winner.foreignFeeUsd > 0 && (
                  <div className="flex justify-between text-[#C4B8A8]">
                    <span>Foreign transaction fee</span>
                    <span className="text-[#E8A844]">+{fmtPrice(winner.foreignFeeUsd)}</span>
                  </div>
                )}
              </div>

              {/* Effective cost */}
              <div className="mt-2 pt-2 border-t border-[#3D2E1A]">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#8B8070]">You pay (after pts)</span>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#C5AA67]">
                      {fmtUsd(winner.netCost)}
                    </p>
                    <p className="text-xs text-[#8B8070]">
                      after redeeming {winner.actualPointsEarned.toLocaleString()} pts
                      @ {winner.realisticCpp.toFixed(2)}¢/pt
                    </p>
                  </div>
                </div>
                {isGuaranteedRate(winner) && (
                  <p className="text-xs text-[#4ECDA4] mt-0.5">(guaranteed)</p>
                )}
                <div className="flex justify-between text-xs text-[#6B5E52] mt-1">
                  <span>Industry values same pts @ {winner.industryAssumedCpp.toFixed(2)}¢</span>
                  <span>→ {fmtUsd(winner.industryCost)}</span>
                </div>
              </div>
            </div>

            {winner.portalBonusApplied && winner.portalBonusUrl && (
              <a
                href={buildPortalDeepLink(winner.portalBonusUrl, result.product.url)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 bg-[#E8A844]/10 border border-[#E8A844]/30 rounded-lg px-3 py-2.5"
              >
                <div>
                  <p className="text-xs font-semibold text-[#E8A844]">
                    Shop via {winner.portalBonusName}
                  </p>
                  <p className="text-xs text-[#8B8070]">
                    Earn {winner.earnAudit.rate}x instead of base rate
                  </p>
                </div>
                <span className="text-[#E8A844] text-xs font-bold flex-shrink-0">→ Go</span>
              </a>
            )}

            <button
              onClick={() => handleCardSelect(winner.cardKey)}
              disabled={selectedCard === winner.cardKey}
              className="w-full bg-[#C5AA67] hover:bg-[#A8893F] disabled:bg-[#4ECDA4] text-[#0D0A06] py-2.5 rounded-lg font-semibold text-sm transition-all"
            >
              {selectedCard === winner.cardKey ? '✓ Selected' : 'Use This Card'}
            </button>
          </div>

          {/* Agent reasoning */}
          {result.agentReasoning && (
            <div className="bg-[#261B0E]/60 border border-[#3D2E1A] rounded-xl p-3">
              <p className="text-xs text-[#8B8070] font-medium mb-1.5">Agent reasoning</p>
              <p className="text-xs text-[#C4B8A8] leading-relaxed">{result.agentReasoning}</p>
            </div>
          )}

          {/* All cards */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-medium text-[#8B8070]">ALL CARDS RANKED</p>
              <div className="flex bg-[#261B0E] border border-[#3D2E1A] rounded-lg p-0.5 gap-0.5">
                <button
                  onClick={() => setSortMode('cost')}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    sortMode === 'cost'
                      ? 'bg-[#C5AA67] text-[#0D0A06]'
                      : 'text-[#8B8070] hover:text-[#C4B8A8]'
                  }`}
                >
                  $ Price
                </button>
                <button
                  onClick={() => setSortMode('points')}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    sortMode === 'points'
                      ? 'bg-[#C5AA67] text-[#0D0A06]'
                      : 'text-[#8B8070] hover:text-[#C4B8A8]'
                  }`}
                >
                  ✦ Points
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {[...result.cards].sort((a, b) =>
                sortMode === 'cost'
                  ? a.netCost - b.netCost
                  : b.actualPointsEarned - a.actualPointsEarned
              ).map((card, idx) => (
                <div
                  key={card.cardKey}
                  className="bg-[#261B0E]/80 border border-[#3D2E1A] rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedCard(expandedCard === card.cardKey ? null : card.cardKey)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-[#261B0E]/30 transition-colors text-left"
                  >
                    {/* Rank badge */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      idx === 0 ? 'bg-[#E8A844]/20 text-[#E8A844] border border-[#E8A844]/40' :
                      idx === 1 ? 'bg-[#261B0E]/60 text-[#C4B8A8] border border-[#3D2E1A]/40' :
                      'bg-[#261B0E]/40 text-[#6B5E52] border border-[#3D2E1A]/60'
                    }`}>
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#E8D8B0] truncate">{card.name}</p>
                      <p className="text-xs text-[#8B8070]">{card.issuer}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {sortMode === 'cost' ? (
                        <>
                          <p className="text-sm font-bold text-[#E8D8B0]">
                            {card.rewardType === 'cashback'
                              ? `+${fmtUsd(card.trueRewardValueUsd)}`
                              : `+${card.actualPointsEarned.toLocaleString()} pts`
                            }
                          </p>
                          <p className="text-xs text-slate-400">
                            net {isGuaranteedRate(card) ? '' : '~'}{fmtUsd(card.netCost)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-[#4ECDA4]">
                            {card.rewardType === 'cashback'
                              ? `+${fmtUsd(card.trueRewardValueUsd)}`
                              : `+${card.actualPointsEarned.toLocaleString()} pts`
                            }
                          </p>
                          <p className="text-xs text-slate-400">
                            net {isGuaranteedRate(card) ? '' : '~'}{fmtUsd(card.netCost)}
                          </p>
                        </>
                      )}
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-[#8B8070] flex-shrink-0 transition-transform ${expandedCard === card.cardKey ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Expanded breakdown */}
                  {expandedCard === card.cardKey && (
                    <div className="border-t border-[#3D2E1A] p-3 space-y-3 bg-[#0D0A06]/40">

                      {/* Compact Zone 2: Points breakdown */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span>Base points</span>
                          <span>{card.basePointsEarned.toLocaleString()} pts</span>
                        </div>
                        {card.bonusPointsEarned > 0 && (
                          <div className="flex justify-between text-[#4ECDA4]">
                            <span>Bonus points</span>
                            <span>+{card.bonusPointsEarned.toLocaleString()} pts</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[#8B8070] pt-1 border-t border-[#3D2E1A]">
                          <span>Conservative</span>
                          <span>{card.conservativeCpp.toFixed(2)}¢/pt</span>
                        </div>
                        <div className="flex justify-between text-[#C5AA67] font-medium">
                          <span>Realistic ←</span>
                          <span>{card.realisticCpp.toFixed(2)}¢/pt</span>
                        </div>
                        <div className="flex justify-between text-[#8B8070]">
                          <span>Best case</span>
                          <span>{card.bestRedemptionRatePerPoint.toFixed(2)}¢/pt</span>
                        </div>
                      </div>

                      {/* Compact Zone 3: Key adjustments */}
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span>Points value</span>
                          <span className="text-[#4ECDA4]">
                            {card.rewardType === 'cashback'
                              ? `−${fmtUsd(card.trueRewardValueUsd)}`
                              : <>−{card.actualPointsEarned.toLocaleString()} pts
                                  <span className="text-slate-500 ml-1 text-xs">({fmtUsd(card.trueRewardValueUsd)})</span>
                                </>
                            }
                          </span>
                        </div>
                        {card.feeBurdenUsd > 0 && (
                          <div className="flex justify-between text-slate-300">
                            <span>Fee per txn</span>
                            <span className="text-[#E8A844]">+{fmtPrice(card.feeBurdenUsd)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[#C4B8A8]">
                          <span>Float value</span>
                          <span className="text-[#4ECDA4]">−{fmtPrice(card.floatValueUsd)}</span>
                        </div>
                        <div className="flex justify-between font-medium pt-1 border-t border-[#3D2E1A]">
                          <span className="text-[#C4B8A8]">Effective cost</span>
                          <span className="text-[#C5AA67]">
                            {isGuaranteedRate(card) ? '' : '~'}{fmtUsd(card.netCost)}
                          </span>
                        </div>
                      </div>

                      {/* Reasoning */}
                      <div className="bg-[#261B0E]/80 rounded-lg p-2.5">
                        <p className="text-xs text-[#C4B8A8] leading-relaxed">{card.reasoning}</p>
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
                          className="flex items-center justify-between gap-2 bg-[#E8A844]/10 border border-[#E8A844]/30 rounded-lg px-3 py-2.5"
                        >
                          <div>
                            <p className="text-xs font-semibold text-[#E8A844]">
                              Shop via {card.portalBonusName}
                            </p>
                            <p className="text-xs text-[#8B8070]">
                              Earn {card.earnAudit.rate}x instead of base rate
                            </p>
                          </div>
                          <span className="text-[#E8A844] text-xs font-bold flex-shrink-0">→ Go</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleCardSelect(card.cardKey)}
                        disabled={selectedCard === card.cardKey}
                        className="w-full bg-[#C5AA67] hover:bg-[#A8893F] disabled:bg-[#4ECDA4] text-[#0D0A06] py-2 rounded-lg font-medium text-xs transition-all"
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
