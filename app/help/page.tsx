'use client';

import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { HelpCircle, Sparkles, Calculator, CreditCard, TrendingUp, Settings, Chrome, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Help & <span className="bg-gradient-to-r from-purple-400 to-yellow-300 bg-clip-text text-transparent">Documentation</span>
          </h1>
          <p className="text-xl text-slate-400">
            Learn how to maximize your credit card rewards with Omni-Wallet
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <Link href="#getting-started" className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-purple-500/50 transition-colors">
            <Sparkles className="w-6 h-6 text-purple-400 mb-3" />
            <h3 className="text-white font-semibold mb-2">Getting Started</h3>
            <p className="text-slate-400 text-sm">Set up your account and link cards</p>
          </Link>
          <Link href="#features" className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-purple-500/50 transition-colors">
            <Calculator className="w-6 h-6 text-yellow-400 mb-3" />
            <h3 className="text-white font-semibold mb-2">Features</h3>
            <p className="text-slate-400 text-sm">Explore all available features</p>
          </Link>
          <Link href="#interchange-flow" className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-purple-500/50 transition-colors">
            <TrendingUp className="w-6 h-6 text-green-400 mb-3" />
            <h3 className="text-white font-semibold mb-2">Interchange Flow</h3>
            <p className="text-slate-400 text-sm">Understand the 6-stage process</p>
          </Link>
          <Link href="#extension" className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-purple-500/50 transition-colors">
            <Chrome className="w-6 h-6 text-blue-400 mb-3" />
            <h3 className="text-white font-semibold mb-2">Browser Extension</h3>
            <p className="text-slate-400 text-sm">Install and use the extension</p>
          </Link>
        </div>

        {/* Getting Started Section */}
        <section id="getting-started" className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-400" />
            Getting Started
          </h2>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold">1</div>
              <div>
                <h3 className="text-white font-semibold mb-2">Create an Account</h3>
                <p className="text-slate-400 text-sm">Sign up using your email to create your Omni-Wallet account. This allows us to sync your portfolio data and provide personalized recommendations.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold">2</div>
              <div>
                <h3 className="text-white font-semibold mb-2">Link Your Credit Cards</h3>
                <p className="text-slate-400 text-sm">Navigate to the Cards page to add your credit cards. Our system will automatically fetch your current balances and reward rates through Fivetran integration.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold">3</div>
              <div>
                <h3 className="text-white font-semibold mb-2">Configure Settings</h3>
                <p className="text-slate-400 text-sm">Visit the Settings page to configure your preferences, including risk tolerance, billing cycle, and GST rate for accurate calculations.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold">4</div>
              <div>
                <h3 className="text-white font-semibold mb-2">Start Optimizing</h3>
                <p className="text-slate-400 text-sm">Use the Pay feature to calculate the best card for any purchase, or explore Offers and Insights to discover new opportunities.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <Calculator className="w-8 h-8 text-yellow-400" />
            Platform Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                Dashboard
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                View your complete portfolio overview, including total balance, individual card values, and integration status.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Real-time portfolio valuation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Card performance comparison</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Integration health monitoring</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-yellow-400" />
                Cards
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Manage and compare your credit cards with detailed earn rates, perks, and transfer partners.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Side-by-side card comparison</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Transfer partner information</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Earn rate breakdown by category</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-400" />
                Offers
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Discover targeted offers and promotions from your card issuers to maximize your rewards.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Personalized offer recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Offer value calculations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Expiration tracking</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Insights
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                AI-powered analytics to understand your spending patterns and optimization opportunities.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Spending category analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Reward optimization suggestions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Historical performance tracking</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-400" />
                Pay
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Calculate the best card for any purchase using our AI-powered interchange optimization engine.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Real-time card ranking</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Net cost calculation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Reward estimation</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-400" />
                Settings
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Configure your account preferences and integration settings.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Risk tolerance configuration</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Billing cycle customization</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Tax rate settings</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Interchange Flow Section */}
        <section id="interchange-flow" className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-400" />
            Understanding the 6-Stage Interchange Flow
          </h2>
          <div className="bg-gradient-to-r from-purple-600/20 to-yellow-500/20 border border-purple-500/30 rounded-xl p-8">
            <p className="text-slate-300 mb-6">
              Our AI-powered optimization engine follows a sophisticated 6-stage process to determine the optimal card for every purchase:
            </p>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold">1</div>
                <div>
                  <p className="font-semibold text-white">Parse Intent</p>
                  <p className="text-sm text-slate-400">Process the purchase amount in USD and identify the transaction category.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold">2</div>
                <div>
                  <p className="font-semibold text-white">Fivetran Syncs Rates</p>
                  <p className="text-sm text-slate-400">Fresh award charts and exchange rates are synchronized to MongoDB for real-time accuracy.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold">3</div>
                <div>
                  <p className="font-semibold text-white">Read Balances</p>
                  <p className="text-sm text-slate-400">Fetch your current portfolio balances in USD across all linked cards.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold">4</div>
                <div>
                  <p className="font-semibold text-white">Score by Category</p>
                  <p className="text-sm text-slate-400">Gemini AI ranks cards by net cost for your specific purchase, considering earn rates and fees.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold">5</div>
                <div>
                  <p className="font-semibold text-white">Track Rewards</p>
                  <p className="text-sm text-slate-400">Calculate earned rewards and update your portfolio balances accordingly.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold">6</div>
                <div>
                  <p className="font-semibold text-white">Resync After Redemption</p>
                  <p className="text-sm text-slate-400">Fivetran re-syncs affected data sources with automatic reconciliation for accuracy.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Extension Section */}
        <section id="extension" className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <Chrome className="w-8 h-8 text-blue-400" />
            Browser Extension
          </h2>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-3">Installation</h3>
              <ol className="space-y-3 text-slate-300">
                <li className="flex gap-3">
                  <span className="font-bold text-purple-400">1.</span>
                  <span>Navigate to the <code className="bg-slate-700 px-2 py-1 rounded text-sm">extension/</code> directory in your project</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-purple-400">2.</span>
                  <span>Run <code className="bg-slate-700 px-2 py-1 rounded text-sm">pnpm run build</code> to build the extension</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-purple-400">3.</span>
                  <span>Open Chrome and go to <code className="bg-slate-700 px-2 py-1 rounded text-sm">chrome://extensions</code></span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-purple-400">4.</span>
                  <span>Enable "Developer mode" in the top right corner</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-purple-400">5.</span>
                  <span>Click "Load unpacked" and select the <code className="bg-slate-700 px-2 py-1 rounded text-sm">extension/dist</code> folder</span>
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-3">Features</h3>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Real-time card recommendations while shopping</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Product detection and automatic analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Side panel for quick access to your portfolio</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Seamless integration with the web platform</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
                <div>
                  <p className="text-yellow-400 font-semibold mb-1">Important</p>
                  <p className="text-slate-300 text-sm">
                    Make sure to set the <code className="bg-slate-700 px-2 py-1 rounded">NEXT_PUBLIC_EXTENSION_ID</code> environment variable in your <code className="bg-slate-700 px-2 py-1 rounded">.env</code> file with your extension's ID for proper communication between the web app and extension.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-purple-400" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">How does Omni-Wallet calculate the best card?</h3>
              <p className="text-slate-400 text-sm">
                Our AI engine analyzes your purchase amount, category, and current portfolio balances. It considers earn rates, annual fees, and transfer partner values to determine the card with the lowest net cost in OP tokens.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">What data sources does Omni-Wallet use?</h3>
              <p className="text-slate-400 text-sm">
                We use Fivetran to synchronize data from multiple sources including Cardlytics, Banyan, Rakuten Impact, and airline/hotel loyalty programs. All data is stored in MongoDB for fast access and analysis.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Is my financial data secure?</h3>
              <p className="text-slate-400 text-sm">
                Yes. We use industry-standard encryption for data transmission and storage. Your credentials are never stored directly—we use secure OAuth flows and token-based authentication with card issuers.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">How often is my data updated?</h3>
              <p className="text-slate-400 text-sm">
                Fivetran automatically syncs data at regular intervals (configurable in settings). Balance updates, reward rates, and offer information are kept current to ensure accurate recommendations.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Can I use Omni-Wallet without the browser extension?</h3>
              <p className="text-slate-400 text-sm">
                Yes! The web platform provides full functionality including card comparison, reward calculations, and insights. The browser extension adds convenience by providing recommendations directly on shopping sites.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-purple-600/20 to-yellow-500/20 border border-purple-500/30 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to optimize your rewards?</h2>
          <p className="text-slate-300 mb-6">Start maximizing your credit card value today with AI-powered recommendations.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/pay">
              <Button className="bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white border-0">
                Calculate Best Card
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/cards">
              <Button variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
                View Your Cards
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
