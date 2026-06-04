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
  trueRewardValueInr: number
  industryRewardValue: number
  feeBurdenInr: number
  floatValueInr: number
  opTokenCost: number
  industryOpCost: number
  savings: number
  effectiveDiscountPercent: number
  reasoning: string
}

interface AnalysisResult {
  product: { name: string; price: number }
  cards: CardResult[]
  winner: CardResult
  industryWinner: CardResult
  agentReasoning: string
  savings: number
}

export function SidePanel() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [pendingProduct, setPendingProduct] = useState<any>(null)

  const API_BASE = 'http://localhost:3000'

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
      chrome.storage.local.get(['pendingAnalysis', 'selectedCards'], (stored) => {
        if (stored.pendingAnalysis) {
          // Consume the pending product and run analysis
          const product = stored.pendingAnalysis
          chrome.storage.local.remove('pendingAnalysis')
          setPendingProduct(product)
          runAnalysis(product)
        } else if (stored.selectedCards && !result) {
          // Restore previous result if available
          setResult(stored.selectedCards as AnalysisResult)
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

  const fmt = (n: number) =>
    '₹' + Math.round(n).toLocaleString('en-IN')

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
          <p className="text-xs text-slate-500">Calculating true OP cost</p>
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
        <p className="text-xs text-slate-500 mt-0.5">List price: {fmt(result.product.price)}</p>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Winner banner */}
        <div className="p-4 space-y-3">
          <div className="bg-purple-900/40 border border-purple-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium text-yellow-400 uppercase tracking-wide">Best card</span>
            </div>
            <div>
              <p className="font-bold text-white">{winner.name}</p>
              <p className="text-xs text-slate-400">{winner.issuer}</p>
            </div>

            {/* OP cost vs industry */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/60 rounded-lg p-2.5">
                <p className="text-xs text-slate-400 mb-1">OP token cost</p>
                <p className="text-lg font-bold text-purple-300">{fmt(winner.opTokenCost)}</p>
                <p className="text-xs text-green-400">{pct(winner.effectiveDiscountPercent)} off</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-2.5">
                <p className="text-xs text-slate-400 mb-1">Industry says</p>
                <p className="text-lg font-bold text-slate-400 line-through">{fmt(winner.industryOpCost)}</p>
                <p className="text-xs text-slate-500">their number</p>
              </div>
            </div>

            {/* Savings from industry */}
            {winner.savings > 0 && (
              <div className="flex items-center gap-2 bg-green-900/30 border border-green-500/30 rounded-lg px-3 py-2">
                <TrendingDown className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <p className="text-xs text-green-300">
                  Bank understated your benefit by <span className="font-bold">{fmt(winner.savings)}</span>
                </p>
              </div>
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
                      <p className="text-sm font-bold text-white">{fmt(card.opTokenCost)}</p>
                      <p className="text-xs text-slate-400">OP cost</p>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${expandedCard === card.cardKey ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Expanded breakdown */}
                  {expandedCard === card.cardKey && (
                    <div className="border-t border-slate-700 p-3 space-y-3 bg-slate-900/40">

                      {/* Step-by-step breakdown */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>List price</span>
                          <span className="text-white font-medium">{fmt(result.product.price)}</span>
                        </div>

                        <div className="flex justify-between text-slate-400">
                          <span>
                            Points earned ({card.actualPointsEarned} pts)
                            {card.earnAudit.exclusionReason && (
                              <span className="text-red-400 ml-1">⚠ excluded</span>
                            )}
                          </span>
                          <span className="text-green-400">−{fmt(card.trueRewardValueInr)}</span>
                        </div>
                        <div className="text-slate-500 pl-2 -mt-1">
                          via {card.bestRedemptionName} @ ₹{card.bestRedemptionRatePerPoint}/pt
                        </div>

                        {card.feeBurdenInr > 0 && (
                          <div className="flex justify-between text-slate-400">
                            <span>Annual fee (per txn)</span>
                            <span className="text-orange-400">+{fmt(card.feeBurdenInr)}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-slate-400">
                          <span>Float value (30d @ 7%)</span>
                          <span className="text-green-400">−{fmt(card.floatValueInr)}</span>
                        </div>

                        <div className="border-t border-slate-700 pt-2 flex justify-between font-medium">
                          <span className="text-slate-300">True OP cost</span>
                          <span className="text-purple-300">{fmt(card.opTokenCost)}</span>
                        </div>

                        <div className="flex justify-between text-slate-500">
                          <span>Industry would say</span>
                          <span className="line-through">{fmt(card.industryOpCost)}</span>
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
