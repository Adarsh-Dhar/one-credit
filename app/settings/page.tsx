'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Settings() {
  const { data: session } = useSession();
  const [apiKey, setApiKey] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Auto-populate email from authenticated session
  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]);

  const handleSaveApiKey = async () => {
    setError('');
    setSuccess(false);

    if (!apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }

    setLoading(true);

    try {
      // Store ONLY the email client-side for display
      localStorage.setItem('userEmail', email || 'demo@omniwallet.com');

      // Send the key to your server to store in env / secrets manager
      // DO NOT store the raw key in MongoDB or localStorage
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, geminiApiKey: apiKey }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setSuccess(true);
      setApiKey(''); // Clear from state after saving
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadApiKey = () => {
    const saved = localStorage.getItem('geminiApiKey');
    const savedEmail = localStorage.getItem('userEmail');
    if (saved) {
      setApiKey(saved.substring(0, 10) + '...' + saved.substring(saved.length - 5));
    }
    if (savedEmail) {
      setEmail(savedEmail);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Settings & Configuration</h1>

        <div className="grid gap-6">
          {/* API Key Section */}
          <Card className="bg-slate-700/50 border-slate-600 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Gemini API Configuration</h2>
            <p className="text-slate-300 mb-6">
              Configure your Google Gemini API key to enable AI-powered card analysis and recommendations. You can get your API key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Google AI Studio
              </a>
              .
            </p>

            <div className="space-y-4">
              <div>
                <Label className="text-white mb-2 block">Email Address</Label>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-600/50 border-slate-500 text-white placeholder:text-slate-400"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">Gemini API Key</Label>
                <Input
                  type="password"
                  placeholder="Paste your API key here (starts with AIzaSy...)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-slate-600/50 border-slate-500 text-white placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Your API key is stored securely server-side.
                </p>
              </div>

              {error && (
                <Alert className="bg-red-500/10 border-red-500/30">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-500/10 border-green-500/30">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-200">
                    Configuration saved successfully!
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSaveApiKey}
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white border-0 w-full"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>

              <Button
                onClick={loadApiKey}
                variant="outline"
                className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10 w-full"
              >
                Load Saved Configuration
              </Button>
            </div>
          </Card>

          {/* Instructions Section */}
          <Card className="bg-slate-700/50 border-slate-600 p-6">
            <h2 className="text-xl font-bold text-white mb-4">How to Get Your API Key</h2>
            <ol className="space-y-3 text-slate-300">
              <li className="flex gap-3">
                <span className="font-bold text-purple-400 min-w-6">1.</span>
                <span>
                  Visit{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    Google AI Studio
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-purple-400 min-w-6">2.</span>
                <span>Sign in with your Google account</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-purple-400 min-w-6">3.</span>
                <span>Click on &quot;Create API key&quot;</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-purple-400 min-w-6">4.</span>
                <span>Copy the generated API key</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-purple-400 min-w-6">5.</span>
                <span>Paste it in the field above and save</span>
              </li>
            </ol>
          </Card>

          {/* Info Section */}
          <Card className="bg-gradient-to-r from-purple-600/20 to-yellow-500/20 border border-purple-500/30 p-6">
            <h2 className="text-xl font-bold text-white mb-4">What You Can Do</h2>
            <ul className="space-y-2 text-slate-300">
              <li className="flex gap-2">
                <span className="text-purple-400">✓</span>
                <span>Analyze your spending patterns with AI</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">✓</span>
                <span>Get personalized card recommendations</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">✓</span>
                <span>Calculate optimal rewards per transaction</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">✓</span>
                <span>Compare cards based on your lifestyle</span>
              </li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  );
}
