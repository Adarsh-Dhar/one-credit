import React from 'react'
import { CreditCard, Settings, ExternalLink } from 'lucide-react'

export function Popup() {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleOpenSidePanel = async () => {
    await chrome.sidePanel.open({ tabId: (await chrome.tabs.query({ active: true }))[0].id })
  }

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  return (
    <div className="w-80 bg-gradient-to-b from-slate-900 to-slate-800 text-white rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-yellow-500 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          <h1 className="font-bold text-lg">OneCredit</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <p className="text-slate-300 text-sm leading-relaxed">
          Analyze your credit cards and find the best one for every purchase. Maximize rewards and minimize opportunity costs.
        </p>

        {/* Status */}
        <div className="bg-slate-800/50 border border-purple-500/30 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-1">Status</p>
          <p className="text-sm font-medium text-green-400">Connected</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleOpenSidePanel}
            className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white py-2 px-4 rounded-lg font-medium text-sm transition-all shadow-lg shadow-purple-500/20"
          >
            Open Transaction Portal
          </button>

          <button
            onClick={handleOpenOptions}
            className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg font-medium text-sm transition-all"
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
            className="flex items-center justify-between text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            <span>Visit OneCredit</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://onecredit.app/help"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            <span>Help & Support</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
