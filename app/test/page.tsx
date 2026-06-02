'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader, CheckCircle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

export default function TestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const tests: Array<{ name: string; fn: () => Promise<void> }> = [
    {
      name: 'MCP Tool: refresh_rates',
      fn: async () => {
        const res = await fetch('/api/tools/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolName: 'refresh_rates',
            toolInput: {},
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error('Failed');
      },
    },
    {
      name: 'MCP Tool: getUserBalances',
      fn: async () => {
        const res = await fetch('/api/tools/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolName: 'getUserBalances',
            toolInput: { userId: 'demo@omniwallet.com' },
          }),
        });
        const data = await res.json();
        if (!data.totalOp) throw new Error('Failed');
      },
    },
    {
      name: 'MCP Tool: updateBalances',
      fn: async () => {
        const res = await fetch('/api/tools/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolName: 'updateBalances',
            toolInput: {
              userId: 'demo@omniwallet.com',
              cardDebits: {
                clearCash: { cashDebit: 10 },
                goldFork: { pointsDebit: 50 },
                skyward: { milesDebit: 100 },
              },
            },
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error('Failed');
      },
    },
    {
      name: 'MCP Tool: get_sync_status',
      fn: async () => {
        const res = await fetch('/api/tools/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolName: 'get_sync_status',
            toolInput: { source: 'airline' },
          }),
        });
        const data = await res.json();
        if (!data.airline) throw new Error('Failed');
      },
    },
    {
      name: 'MCP Tool: sync_after_redemption',
      fn: async () => {
        const res = await fetch('/api/tools/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolName: 'sync_after_redemption',
            toolInput: { sources: ['bank', 'rewards'] },
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error('Failed');
      },
    },
    {
      name: 'API Route: Wallet',
      fn: async () => {
        const res = await fetch('/api/wallet?email=demo@omniwallet.com');
        const data = await res.json();
        if (!data.totalOp) throw new Error('Failed');
      },
    },
    {
      name: 'API Route: Users',
      fn: async () => {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'demo@omniwallet.com',
            name: 'Demo User',
          }),
        });
        const data = await res.json();
        if (!data.email) throw new Error('Failed');
      },
    },
    {
      name: 'API Route: AI Analyze',
      fn: async () => {
        const res = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'What is my current OP balance?',
            apiKey: process.env.GOOGLE_API_KEY || '',
          }),
        });
        const data = await res.json();
        if (!data.response) throw new Error('Failed');
      },
    },
  ];

  const runTests = async () => {
    setRunning(true);
    const testResults: TestResult[] = tests.map((t) => ({ name: t.name, status: 'pending' }));
    setResults(testResults);

    for (let i = 0; i < tests.length; i++) {
      const startTime = Date.now();
      testResults[i].status = 'running';
      setResults([...testResults]);

      try {
        await tests[i].fn();
        testResults[i].status = 'passed';
        testResults[i].duration = Date.now() - startTime;
      } catch (error) {
        testResults[i].status = 'failed';
        testResults[i].message = error instanceof Error ? error.message : 'Unknown error';
        testResults[i].duration = Date.now() - startTime;
      }

      setResults([...testResults]);
    }

    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">MCP & Gemini Testing</h1>
          <p className="text-slate-400 mb-6">
            Run automated tests for all MCP tools and API endpoints to verify functionality.
          </p>
          <Button
            onClick={runTests}
            disabled={running}
            className="bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white border-0"
          >
            {running ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run All Tests'
            )}
          </Button>
        </div>

        {/* Test Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Test Results</h2>
              <div className="text-sm text-slate-400">
                {results.filter((r) => r.status === 'passed').length}/{results.length} passed
              </div>
            </div>

            {results.map((result, idx) => (
              <Card
                key={idx}
                className={`border-0 p-4 flex items-center justify-between ${
                  result.status === 'passed'
                    ? 'bg-green-500/10'
                    : result.status === 'failed'
                      ? 'bg-red-500/10'
                      : result.status === 'running'
                        ? 'bg-blue-500/10'
                        : 'bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {result.status === 'passed' && <CheckCircle className="w-5 h-5 text-green-400" />}
                  {result.status === 'failed' && <div className="w-5 h-5 text-red-400">✕</div>}
                  {result.status === 'running' && <Loader className="w-5 h-5 text-blue-400 animate-spin" />}
                  {result.status === 'pending' && <div className="w-5 h-5 text-slate-400">○</div>}

                  <div>
                    <p
                      className={`font-semibold ${
                        result.status === 'passed'
                          ? 'text-green-300'
                          : result.status === 'failed'
                            ? 'text-red-300'
                            : result.status === 'running'
                              ? 'text-blue-300'
                              : 'text-slate-300'
                      }`}
                    >
                      {result.name}
                    </p>
                    {result.message && <p className="text-xs text-red-300">{result.message}</p>}
                  </div>
                </div>

                {result.duration && <span className="text-xs text-slate-400">{result.duration}ms</span>}
              </Card>
            ))}
          </div>
        )}

        {/* Information Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-700/50 border-slate-600 p-6">
            <h3 className="font-bold text-white mb-3">About MCP Tools</h3>
            <p className="text-slate-300 text-sm mb-4">
              Model Context Protocol (MCP) tools are utility functions that process credit card data and provide intelligent recommendations.
            </p>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>✓ analyze_transactions: Process spending patterns</li>
              <li>✓ calculate_rewards: Compute earning potential</li>
              <li>✓ compare_cards: Evaluate card performance</li>
              <li>✓ optimize_spending: Strategy recommendations</li>
              <li>✓ validate_transaction: Security checks</li>
              <li>✓ format_recommendation: User-friendly output</li>
            </ul>
          </Card>

          <Card className="bg-slate-700/50 border-slate-600 p-6">
            <h3 className="font-bold text-white mb-3">Gemini Integration</h3>
            <p className="text-slate-300 text-sm mb-4">
              Google Gemini AI provides natural language analysis and reasoning about credit card optimization strategies.
            </p>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>✓ Tool calling with MCP functions</li>
              <li>✓ Natural language prompts</li>
              <li>✓ Advanced reasoning capabilities</li>
              <li>✓ Real-time analysis</li>
              <li>✓ Personalized recommendations</li>
              <li>✓ API-based integration</li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  );
}
