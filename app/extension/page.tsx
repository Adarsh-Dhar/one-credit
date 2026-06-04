'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import OneCreditTxPortal from '@/components/OneCreditTxPortal';

export default function ExtensionTestPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-12 border-b border-slate-700">
        <h1 className="text-4xl font-bold text-white mb-4">
          OneCredit Browser Extension
        </h1>
        <p className="text-xl text-slate-400 mb-8">
          Interactive demo of the Transaction Portal component
        </p>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-white font-semibold mb-2">Extension Features:</h3>
            <ul className="text-slate-300 space-y-2 text-sm">
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <span>
                  <strong>Product Detection</strong> - Automatically detects
                  products on Amazon, Walmart, Best Buy, and Target
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <span>
                  <strong>OP Cost Analysis</strong> - Calculates optimal points
                  cost for each card using AI-powered algorithms
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <span>
                  <strong>Smart Recommendations</strong> - Ranks cards by OP
                  cost, considering opportunity costs and token scarcity
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <span>
                  <strong>Real-time Integration</strong> - Connects to your
                  credit card portfolio in the main app
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <h3 className="text-white font-semibold mb-2">
              How OP Tokens Work:
            </h3>
            <p className="text-slate-300 text-sm mb-3">
              OP (Optimal Points) is a unified cost unit that factors in:
            </p>
            <ul className="text-slate-300 space-y-2 text-sm ml-4">
              <li>
                • Net dollar cost after rewards earned back
              </li>
              <li>
                • Opportunity cost of using premium tokens
              </li>
              <li>
                • Category earn multipliers (3x vs 1x)
              </li>
              <li>
                • Token scarcity penalties
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <h3 className="text-white font-semibold mb-2">Demo Instructions:</h3>
            <p className="text-slate-300 text-sm">
              Use the dev state switcher in the bottom-left to cycle through all
              5 states: <code className="bg-slate-900 px-2 py-1 rounded">idle → detected → calculating → results → confirmed</code>
            </p>
          </div>
        </div>
      </div>

      {/* Portal Demo */}
      <div className="relative w-full h-96">
        <OneCreditTxPortal />
      </div>

      {/* Integration Details */}
      <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">
          Integration Architecture
        </h2>

        <div className="space-y-6">
          {/* Extension Structure */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              📦 Extension Structure
            </h3>
            <div className="space-y-3 text-slate-300 text-sm">
              <div className="font-mono bg-slate-900 p-3 rounded text-xs overflow-auto">
                <pre>{`extension/
├── manifest.json          # Extension config
├── background.js          # Service worker
├── content.js             # Product detection
├── popup.html/js          # Extension popup UI
├── sidepanel.html         # Main portal container
└── bridge.ts              # Main app communication`}</pre>
              </div>
            </div>
          </div>

          {/* API Endpoints */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              🔌 API Endpoints
            </h3>
            <div className="space-y-3 text-slate-300 text-sm">
              <div>
                <p className="font-semibold text-white mb-1">
                  POST /api/extension/analyze
                </p>
                <p className="text-slate-400">
                  Analyzes a product and calculates OP costs for all user cards
                </p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">
                  POST /api/extension/checkout
                </p>
                <p className="text-slate-400">
                  Records when user selects a card at checkout
                </p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">
                  GET /api/extension/status
                </p>
                <p className="text-slate-400">
                  Checks extension connection status and supported sites
                </p>
              </div>
            </div>
          </div>

          {/* Component States */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              ⚡ Portal States
            </h3>
            <div className="space-y-2 text-slate-300 text-sm">
              <div className="flex gap-3">
                <span className="text-indigo-400 font-semibold">idle</span>
                <span>Collapsed pill anchored to right edge</span>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-400 font-semibold">detected</span>
                <span>Preview card with product info</span>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-400 font-semibold">
                  calculating
                </span>
                <span>Full sidebar with animated loading steps</span>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-400 font-semibold">results</span>
                <span>
                  Card ranking with expandable details and OP costs
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-400 font-semibold">confirmed</span>
                <span>Success screen with savings summary</span>
              </div>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              🚀 How to Use the Extension
            </h3>
            <ol className="space-y-2 text-slate-300 text-sm list-decimal list-inside">
              <li>Load the extension in chrome://extensions</li>
              <li>
                Enable &quot;Developer mode&quot; and click &quot;Load unpacked&quot;
              </li>
              <li>Select the <code className="bg-slate-900 px-1">extension</code> folder</li>
              <li>Visit Amazon, Walmart, Best Buy, or Target</li>
              <li>Click the OneCredit extension icon</li>
              <li>Click &quot;Analyze with AI&quot; to see the portal in action</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
