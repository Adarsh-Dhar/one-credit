import React, { useState, useEffect } from 'react'
import { Settings, Plus, X } from 'lucide-react'

export function Options() {
  const [cards, setCards] = useState<any[]>([])
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    chrome.storage.sync.get(['cards', 'apiKey'], (result) => {
      if (result.cards) {
setCards(result.cards)
}
      if (result.apiKey) {
setApiKey(result.apiKey)
}
    })
  }, [])

  const handleSave = () => {
    chrome.storage.sync.set({ cards, apiKey }, () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const handleAddCard = () => {
    setCards([...cards, { id: Date.now(), name: '', issuer: '', earnRate: 1 }])
  }

  const handleRemoveCard = (id: number) => {
    setCards(cards.filter((c) => c.id !== id))
  }

  const handleCardChange = (id: number, field: string, value: any) => {
    setCards(
      cards.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-6 h-6 text-purple-400" />
          <h1 className="text-3xl font-bold">OneCredit Settings</h1>
        </div>

        {/* API Key Section */}
        <div className="bg-slate-800/50 border border-purple-500/30 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">API Configuration</h2>
          <div>
            <label className="block text-sm text-slate-300 mb-2">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OneCredit API key"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Cards Section */}
        <div className="bg-slate-800/50 border border-purple-500/30 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Cards</h2>
            <button
              onClick={handleAddCard}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 px-3 py-1 rounded-lg text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Card
            </button>
          </div>

          {cards.length === 0 ? (
            <p className="text-slate-400 text-sm">No cards configured yet. Add one to get started.</p>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => (
                <div key={card.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Card Name</label>
                      <input
                        type="text"
                        value={card.name}
                        onChange={(e) => handleCardChange(card.id, 'name', e.target.value)}
                        placeholder="e.g., Chase Sapphire Reserve"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Issuer</label>
                      <input
                        type="text"
                        value={card.issuer}
                        onChange={(e) => handleCardChange(card.id, 'issuer', e.target.value)}
                        placeholder="e.g., Chase"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Earn Rate</label>
                      <input
                        type="number"
                        value={card.earnRate}
                        onChange={(e) => handleCardChange(card.id, 'earnRate', parseFloat(e.target.value))}
                        placeholder="1"
                        step="0.1"
                        min="0"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveCard(card.id)}
                      className="flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-red-500/30 text-slate-300 hover:text-red-300 rounded px-3 py-2 text-sm transition-all mt-6"
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white py-3 px-4 rounded-lg font-semibold transition-all shadow-lg shadow-purple-500/20"
        >
          {saved ? '✓ Settings Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
