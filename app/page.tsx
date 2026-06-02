'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, DollarSign, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [wallet, setWallet] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = localStorage.getItem('userEmail') || 'demo@omniwallet.com';
    fetch(`/api/wallet?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => {
        setWallet(data.totalOp ?? 150000);
      })
      .catch(() => setWallet(150000))
      .finally(() => setLoading(false));
  }, []);

  const walletUSD = (wallet / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Welcome to <span className="bg-gradient-to-r from-purple-400 to-yellow-300 bg-clip-text text-transparent">Omni-Wallet</span>
          </h1>
          <p className="text-xl text-slate-400 mb-6">
            AI-powered OP token portfolio management with Fivetran data synchronization
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link href="/test">
              <Button className="bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white border-0">
                <Sparkles className="w-4 h-4 mr-2" />
                Test Interchange
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
                <DollarSign className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </Link>
          </div>
        </div>

        {/* Wallet Overview */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">OP Token Portfolio</h2>
          <div className="bg-gradient-to-r from-purple-600/20 to-yellow-500/20 border border-purple-500/30 rounded-lg p-8">
            <p className="text-slate-400 text-sm mb-2">Total OP Balance</p>
            <div className="flex items-baseline gap-2">
              {loading ? (
                <p className="text-5xl font-bold text-purple-400">Loading...</p>
              ) : (
                <p className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-yellow-300 bg-clip-text text-transparent">
                  {wallet.toLocaleString()}
                </p>
              )}
              <span className="text-2xl text-purple-300">OP</span>
            </div>
            <p className="text-slate-300 mt-2">
              USD Equivalent: <span className="font-bold text-yellow-300">${walletUSD}</span>
            </p>
            <p className="text-slate-400 text-xs mt-4">1 OP = $0.01 USD</p>
          </div>
        </section>

        {/* Integration Status */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-slate-400 text-sm">Fivetran</p>
            </div>
            <p className="text-xl font-bold text-white">Data Sync</p>
            <p className="text-slate-500 text-xs mt-2">Live rates & balances</p>
          </div>

          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-slate-400 text-sm">MongoDB</p>
            </div>
            <p className="text-xl font-bold text-white">Data Store</p>
            <p className="text-slate-500 text-xs mt-2">Portfolio persistence</p>
          </div>

          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-slate-400 text-sm">Gemini AI</p>
            </div>
            <p className="text-xl font-bold text-white">Optimization</p>
            <p className="text-slate-500 text-xs mt-2">Smart allocation</p>
          </div>
        </section>

        {/* Core Flow Info */}
        <section className="bg-slate-700/30 border border-slate-600 rounded-lg p-8">
          <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-yellow-300" />
            6-Stage OP Interchange Flow
          </h3>
          <div className="space-y-4 text-slate-300">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">1</div>
              <div>
                <p className="font-semibold text-white">Parse Intent</p>
                <p className="text-sm text-slate-400">Convert USD to OP (1 OP = $0.01)</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">2</div>
              <div>
                <p className="font-semibold text-white">Fivetran Syncs Rates</p>
                <p className="text-sm text-slate-400">Fresh award charts & exchange rates to MongoDB</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">3</div>
              <div>
                <p className="font-semibold text-white">Read Balances in OP</p>
                <p className="text-sm text-slate-400">Fetch portfolio, convert to OP using fresh rates</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">4</div>
              <div>
                <p className="font-semibold text-white">Score by Category</p>
                <p className="text-sm text-slate-400">Gemini ranks assets by OP/$ for user's need</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">5</div>
              <div>
                <p className="font-semibold text-white">Debit OP → Update Balances</p>
                <p className="text-sm text-slate-400">Apply per-asset debits, convert back to raw units</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">6</div>
              <div>
                <p className="font-semibold text-white">Resync After Redemption</p>
                <p className="text-sm text-slate-400">Fivetran re-syncs affected sources, auto-reconcile</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
