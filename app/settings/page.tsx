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
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({
    homeAirport: '',
    topSpendCategories: [] as string[],
    carryBalance: '' as 'yes' | 'sometimes' | 'never',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [airportLoading, setAirportLoading] = useState(false)
  const [categoryLoading, setCategoryLoading] = useState(false)

  const handleDetectAirport = () => {
    if (!navigator.geolocation) {
return
}
    setAirportLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `/api/settings/nearest-airport?lat=${coords.latitude}&lng=${coords.longitude}`
          )
          const data = await res.json()
          if (data.airport?.iata) {
            setProfile(p => ({ ...p, homeAirport: data.airport.iata }))
          }
        } finally {
          setAirportLoading(false)
        }
      },
      () => setAirportLoading(false)   // user denied location
    )
  }

  const handleDetectCategories = async () => {
    setCategoryLoading(true)
    try {
      const res = await fetch('/api/settings/top-categories')
      const data = await res.json()
      if (data.topCategories?.length) {
        setProfile(p => ({ ...p, topSpendCategories: data.topCategories }))
      }
    } finally {
      setCategoryLoading(false)
    }
  }

  // Auto-populate email from authenticated session
  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]);

  // Load profile on mount
  useEffect(() => {
    if (!session?.user?.email) {
      return;
    }
    
    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const res = await fetch('/api/settings/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfile(data.profile);
          }
        }
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load profile',
          variant: 'destructive',
        });
      } finally {
        setProfileLoading(false);
      }
    };
    
    loadProfile();
  }, [session?.user?.email]);

  const handleSaveProfile = async () => {
    setError('');
    setSuccess(false);
    setProfileLoading(true);

    try {
      const res = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        throw new Error('Failed to save profile');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    setError('');
    setSuccess(false);

    if (!apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }

    setLoading(true);

    try {
      // Send the key to your server to store in env / secrets manager
      // DO NOT store the raw key in MongoDB or localStorage
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, geminiApiKey: apiKey }),
      });

      if (!res.ok) {
throw new Error('Failed to save');
}

      setSuccess(true);
      setApiKey(''); // Clear from state after saving
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Failed to save configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0A06]">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#E8D8B0] mb-8">Settings & Configuration</h1>

        <div className="grid gap-6">
          {/* Profile Section */}
          <Card className="bg-[#261B0E]/80 border-[#3D2E1A] p-6">
            <h2 className="text-xl font-bold text-[#E8D8B0] mb-4">Your Profile</h2>
            <p className="text-[#C4B8A8] mb-6">
              Tell us about your spending habits to improve AI recommendations.
            </p>

            <div className="space-y-4">
              <div>
                <Label className="text-[#E8D8B0] mb-2 block">Home Airport</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="e.g. JFK, LHR, BOM"
                    value={profile.homeAirport}
                    onChange={(e) => setProfile({ ...profile, homeAirport: e.target.value })}
                    className="bg-[#261B0E]/80 border-[#3D2E1A] text-[#E8D8B0] placeholder:text-[#6B5E52] flex-1"
                  />
                  <Button
                    onClick={handleDetectAirport}
                    disabled={airportLoading}
                    variant="outline"
                    className="border-[#3D2E1A] text-[#C4B8A8] hover:text-[#E8D8B0] hover:bg-[#261B0E] whitespace-nowrap"
                  >
                    {airportLoading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      '📍 Detect'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Or click Detect to auto-find from your location.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[#E8D8B0]">Top Spend Categories</Label>
                  <Button
                    onClick={handleDetectCategories}
                    disabled={categoryLoading}
                    variant="outline"
                    className="border-[#3D2E1A] text-[#C4B8A8] hover:text-[#E8D8B0] hover:bg-[#261B0E] text-xs h-7 px-2"
                  >
                    {categoryLoading ? (
                      <Loader className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      '⚡'
                    )}
                    {categoryLoading ? 'Analysing...' : 'Auto-detect from transactions'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1].map((i) => (
                    <select
                      key={i}
                      value={profile.topSpendCategories[i] || ''}
                      onChange={(e) => {
                        const newCats = [...profile.topSpendCategories]
                        newCats[i] = e.target.value
                        setProfile({ ...profile, topSpendCategories: newCats })
                      }}
                      className="bg-[#261B0E]/80 border-[#3D2E1A] text-[#E8D8B0] p-2 rounded"
                    >
                      <option value="">Select...</option>
                      <option value="dining">Dining</option>
                      <option value="groceries">Groceries</option>
                      <option value="travel">Travel</option>
                      <option value="gas">Gas</option>
                      <option value="streaming">Streaming</option>
                      <option value="other">Other</option>
                    </select>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Auto-detect picks these from your real transaction history.
                </p>
              </div>

              <div>
                <Label className="text-[#E8D8B0] mb-2 block">Do You Carry a Balance?</Label>
                <div className="flex gap-2">
                  {(['yes', 'sometimes', 'never'] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setProfile({ ...profile, carryBalance: option })}
                      className={`flex-1 py-2 rounded capitalize ${
                        profile.carryBalance === option
                          ? 'bg-[#C5AA67] text-[#0D0A06]'
                          : 'bg-[#261B0E]/80 border-[#3D2E1A] text-[#C4B8A8]'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
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
                    Profile saved successfully!
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSaveProfile}
                disabled={profileLoading}
                className="bg-[#C5AA67] hover:bg-[#A8893F] text-[#0D0A06] border-0 w-full"
              >
                {profileLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </div>
          </Card>

          {/* API Key Section */}
          <Card className="bg-[#261B0E]/80 border-[#3D2E1A] p-6">
            <h2 className="text-xl font-bold text-[#E8D8B0] mb-4">Gemini API Configuration</h2>
            <p className="text-[#C4B8A8] mb-6">
              Configure your Google Gemini API key to enable AI-powered card analysis and recommendations. You can get your API key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C5AA67] hover:text-[#DCC98A] underline"
              >
                Google AI Studio
              </a>
              .
            </p>

            <div className="space-y-4">
              <div>
                <Label className="text-[#E8D8B0] mb-2 block">Email Address</Label>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#261B0E]/80 border-[#3D2E1A] text-[#E8D8B0] placeholder:text-[#6B5E52]"
                />
              </div>

              <div>
                <Label className="text-[#E8D8B0] mb-2 block">Gemini API Key</Label>
                <Input
                  type="password"
                  placeholder="Paste your API key here (starts with AIzaSy...)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-[#261B0E]/80 border-[#3D2E1A] text-[#E8D8B0] placeholder:text-[#6B5E52]"
                />
                <p className="text-xs text-[#8B8070] mt-2">
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
                className="bg-[#C5AA67] hover:bg-[#A8893F] text-[#0D0A06] border-0 w-full"
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
            </div>
          </Card>

          {/* Instructions Section */}
          <Card className="bg-[#261B0E]/80 border-[#3D2E1A] p-6">
            <h2 className="text-xl font-bold text-[#E8D8B0] mb-4">How to Get Your API Key</h2>
            <ol className="space-y-3 text-[#C4B8A8]">
              <li className="flex gap-3">
                <span className="font-bold text-[#C5AA67] min-w-6">1.</span>
                <span>
                  Visit{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#C5AA67] hover:text-[#DCC98A] underline"
                  >
                    Google AI Studio
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#C5AA67] min-w-6">2.</span>
                <span>Sign in with your Google account</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#C5AA67] min-w-6">3.</span>
                <span>Click on &quot;Create API key&quot;</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#C5AA67] min-w-6">4.</span>
                <span>Copy the generated API key</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#C5AA67] min-w-6">5.</span>
                <span>Paste it in the field above and save</span>
              </li>
            </ol>
          </Card>

          {/* Info Section */}
          <Card className="bg-[#261B0E] border border-[#C5AA67]/30 p-6">
            <h2 className="text-xl font-bold text-[#E8D8B0] mb-4">What You Can Do</h2>
            <ul className="space-y-2 text-[#C4B8A8]">
              <li className="flex gap-2">
                <span className="text-[#C5AA67]">✓</span>
                <span>Analyze your spending patterns with AI</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#C5AA67]">✓</span>
                <span>Get personalized card recommendations</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#C5AA67]">✓</span>
                <span>Calculate optimal rewards per transaction</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#C5AA67]">✓</span>
                <span>Compare cards based on your lifestyle</span>
              </li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  );
}
