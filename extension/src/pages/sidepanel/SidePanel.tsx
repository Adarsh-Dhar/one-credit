import React, { useState, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Card {
  key: string
  name: string
  issuer: string
  opCost: number
  rank: number
  earnRate: number
  rewardsEarned: number
  opportunityMultiplier: number
  reasoning: string
}

export function SidePanel() {
  const [cards, setCards] = useState<Card[]>([])
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load cards from chrome storage
    chrome.storage.local.get('selectedCards', (result) => {
      if (result.selectedCards) {
        setCards(result.selectedCards)
        if (result.selectedCards.length > 0) {
          setExpandedCard(result.selectedCards[0].key)
        }
      }
      setLoading(false)
    })
  }, [])

  const handleCardSelect = async (cardKey: string) => {
    setSelectedCard(cardKey)
    // Send message to background script
    chrome.runtime.sendMessage(
      {
        type: 'CARD_SELECTED',
        cardKey,
      },
      (response) => {
        if (response?.success) {
          setTimeout(() => setSelectedCard(null), 2000)
        }
      }
    )
  }

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-purple-400"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </motion.div>
          </div>
          <p className="text-slate-400 text-sm mt-3">Loading cards...</p>
        </div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-slate-400 text-sm">No cards available. Please configure your cards in settings.</p>
        </div>
      </div>
    )
  }

  const winner = cards[0]
  const savings = cards.length > 1 ? cards[cards.length - 1].opCost - cards[0].opCost : 0

  return (
    <div className="h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col text-white overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-purple-600/10 to-yellow-500/10 border-b border-purple-500/30 p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold">Transaction Analysis</h2>
        <p className="text-sm text-slate-400 mt-1">Optimal card selection for your purchase</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Winner Banner */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-2">RECOMMENDED CARD</p>
            <h3 className="text-lg font-bold text-white mb-2">{winner.name}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-400">OP Cost</p>
                <p className="font-semibold text-white">{winner.opCost}</p>
              </div>
              <div>
                <p className="text-slate-400">Savings</p>
                <p className="font-semibold text-green-400">+{savings}</p>
              </div>
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-400 px-1">ALL OPTIONS</p>
            <AnimatePresence mode="popLayout">
              {cards.map((card, idx) => (
                <motion.div
                  key={card.key}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-800/50 border border-purple-500/20 rounded-lg overflow-hidden hover:border-purple-500/40 transition-colors"
                >
                  {/* Card Header */}
                  <button
                    onClick={() => setExpandedCard(expandedCard === card.key ? null : card.key)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <div className={`w-2 h-10 rounded-full bg-gradient-to-b ${card.key === 'chase-sapphire' ? 'from-purple-600 to-purple-800' : card.key === 'amex_gold' ? 'from-yellow-500 to-yellow-600' : 'from-slate-600 to-slate-700'}`} />
                      <div>
                        <p className="font-medium text-sm text-white">{card.name}</p>
                        <p className="text-xs text-slate-400">{card.issuer}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-sm font-semibold text-white">{card.opCost}</p>
                        <p className="text-xs text-slate-400">OP cost</p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedCard === card.key ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </motion.div>
                  </button>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedCard === card.key && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-purple-500/20 px-4 py-3 bg-slate-900/50 space-y-3 text-sm"
                      >
                        <div>
                          <p className="text-slate-400 text-xs font-medium mb-1">Reasoning</p>
                          <p className="text-slate-300 text-xs leading-relaxed">{card.reasoning}</p>
                        </div>
                        <button
                          onClick={() => handleCardSelect(card.key)}
                          disabled={selectedCard === card.key}
                          className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 disabled:from-green-600 disabled:to-green-700 text-white py-2 px-3 rounded-lg font-medium text-xs transition-all"
                        >
                          {selectedCard === card.key ? '✓ Selected' : 'Use This Card'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
