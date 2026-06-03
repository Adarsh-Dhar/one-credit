import React from 'react'
import { CreditCard, Settings, ExternalLink, Sparkles } from 'lucide-react'

export function Popup() {
  const handleOpenSidePanel = async () => {
    const currentWindow = await chrome.windows.getCurrent()
    if (currentWindow.id) {
      await chrome.sidePanel.open({ windowId: currentWindow.id })
    }
  }

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-yellow-500 p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <h1 className="font-bold text-lg">OneCredit</h1>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Description */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            AI-powered credit card optimizer. Find the best card for every purchase and maximize your rewards.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Status</p>
            <p className="text-sm font-medium text-green-400">Active</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Cards</p>
            <p className="text-sm font-medium text-purple-300">12</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleOpenSidePanel}
            className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white py-3 px-4 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Open Transaction Portal
          </button>

          <button
            onClick={handleOpenOptions}
            className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-xl font-medium text-sm transition-all border border-slate-600"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Footer Links */}
        <div className="pt-4 border-t border-slate-700 space-y-2">
          <a
            href="https://onecredit.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-xs text-slate-400 hover:text-slate-300 transition-colors py-2"
          >
            <span>Visit OneCredit</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://onecredit.app/help"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-xs text-slate-400 hover:text-slate-300 transition-colors py-2"
          >
            <span>Help & Support</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
