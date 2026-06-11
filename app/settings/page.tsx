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
  const [redactedKey, setRedactedKey] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [email, setEmail] = useState('');
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeySuccess, setApiKeySuccess] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const [profile, setProfile] = useState({
    homeAirport: '',
    homeAirportName: '',
    topSpendCategories: [] as string[],
    carryBalance: '' as 'yes' | 'sometimes' | 'never',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [airportLoading, setAirportLoading] = useState(false)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'>('idle')

  const autoDetectAirport = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      console.error('Geolocation not supported by this browser');
      return;
    }
    setLocationStatus('requesting');
    setAirportLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setLocationStatus('granted');
        try {
          const res = await fetch(`/api/settings/nearest-airport?lat=${coords.latitude}&lng=${coords.longitude}`);
          const data = await res.json();
          if (data.airport?.iata) {
            setProfile(p => {
              const updated = { ...p, homeAirport: data.airport.iata, homeAirportName: data.airport.name };
              // silent auto-save
              fetch('/api/settings/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
              return updated;
            });
          }
        } finally {
          setAirportLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error.code, error.message);
        setLocationStatus('denied');
        setAirportLoading(false);
        
        // Show user-friendly error message
        let errorMessage = 'Location access denied';
        if (error.code === 1) {
          errorMessage = 'Location permission denied by user';
        } else if (error.code === 2) {
          errorMessage = 'Unable to determine your location';
        } else if (error.code === 3) {
          errorMessage = 'Location request timed out';
        }
        toast({
          title: 'Location Error',
          description: errorMessage,
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const autoDetectCategories = async () => {
    setCategoryLoading(true);
    try {
      const res = await fetch('/api/settings/top-categories');
      const data = await res.json();
      if (data.topCategories?.length) {
        setProfile(p => {
          const updated = { ...p, topSpendCategories: data.topCategories };
          fetch('/api/settings/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
          return updated;
        });
      }
    } finally {
      setCategoryLoading(false);
    }
  };

  // Auto-populate email from authenticated session
  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]);

  // Load existing API key on mount
  useEffect(() => {
    if (!session?.user?.email) {
      return;
    }

    const loadApiKey = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setHasApiKey(data.hasApiKey);
          setRedactedKey(data.redactedKey);
        }
      } catch {
        // Silently fail if we can't load the key
      }
    };

    loadApiKey();
  }, [session?.user?.email]);

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
          const existing = data.profile || {};
          setProfile(existing);
          if (!existing.homeAirport) {
            autoDetectAirport();
          }
          if (!existing.topSpendCategories?.length) {
            autoDetectCategories();
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
    setProfileError('');
    setProfileSuccess(false);
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

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch {
      setProfileError('Failed to save profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    setApiKeyError('');
    setApiKeySuccess(false);

    // If user is editing but didn't enter a new key, just cancel the edit mode
    if (isEditingApiKey && !apiKey.trim()) {
      setIsEditingApiKey(false);
      return;
    }

    if (!apiKey.trim()) {
      setApiKeyError('Please enter your Gemini API key');
      return;
    }

    setApiKeyLoading(true);

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

      setApiKeySuccess(true);
      setApiKey(''); // Clear from state after saving
      setIsEditingApiKey(false); // Reset editing mode
      // Reload the redacted key
      const keyRes = await fetch('/api/settings');
      if (keyRes.ok) {
        const keyData = await keyRes.json();
        setHasApiKey(keyData.hasApiKey);
        setRedactedKey(keyData.redactedKey);
      }
      setTimeout(() => setApiKeySuccess(false), 3000);
    } catch {
      setApiKeyError('Failed to save configuration. Please try again.');
    } finally {
      setApiKeyLoading(false);
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
              Profile data is detected automatically from your location and transaction history.
            </p>

            <div className="space-y-4">
              <div>
                <Label className="text-[#E8D8B0] mb-2 block">Home Airport</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Enter airport code (e.g., BBI, DEL)"
                      value={profile.homeAirport}
                      onChange={(e) => setProfile({ ...profile, homeAirport: e.target.value.toUpperCase(), homeAirportName: '' })}
                      className="bg-[#261B0E]/80 border-[#3D2E1A] text-[#E8D8B0] placeholder:text-[#6B5E52] flex-1"
                    />
                    <Button
                      onClick={autoDetectAirport}
                      disabled={airportLoading}
                      variant="outline"
                      className="bg-[#261B0E]/80 border-[#3D2E1A] text-[#C5AA67] hover:bg-[#3D2E1A]"
                    >
                      {airportLoading ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        'Auto-detect'
                      )}
                    </Button>
                  </div>
                  {profile.homeAirportName && (
                    <div className="flex items-center gap-2 text-sm text-[#C4B8A8]">
                      <span className="text-[#C5AA67]">✈</span>
                      <span>{profile.homeAirportName} ({profile.homeAirport})</span>
                    </div>
                  )}
                  {locationStatus === 'denied' && (
                    <span className="text-slate-400 text-xs">Location access denied — enter manually</span>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-[#E8D8B0] mb-2 block">Top Spend Categories</Label>
                <div className="flex items-center gap-2 flex-wrap py-2">
                  {categoryLoading ? (
                    <><Loader className="w-4 h-4 animate-spin text-[#C5AA67]" /><span className="text-[#C4B8A8] text-sm">Analysing transaction history…</span></>
                  ) : profile.topSpendCategories.length ? (
                    profile.topSpendCategories.map(cat => (
                      <span key={cat} className="px-3 py-1 rounded-full bg-[#C5AA67]/15 border border-[#C5AA67]/30 text-[#C5AA67] text-sm capitalize">
                        {cat}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-sm">No transaction history found</span>
                  )}
                </div>
              </div>

              {profileError && (
                <Alert className="bg-red-500/10 border-red-500/30">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-200">{profileError}</AlertDescription>
                </Alert>
              )}

              {profileSuccess && (
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
                    Saving Preference...
                  </>
                ) : (
                  'Save Preference'
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
                {hasApiKey && redactedKey && !isEditingApiKey ? (
                  <div className="flex items-center gap-2 py-2 px-3 rounded bg-[#1A1208] border border-[#3D2E1A] text-[#E8D8B0]">
                    <span className="font-mono text-sm">{redactedKey}</span>
                    <button
                      onClick={() => setIsEditingApiKey(true)}
                      className="text-xs text-[#C5AA67] hover:text-[#DCC98A] underline ml-2"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder={hasApiKey ? "Enter new API key to replace existing key..." : "Paste your API key here (starts with AIzaSy...)"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="bg-[#261B0E]/80 border-[#3D2E1A] text-[#E8D8B0] placeholder:text-[#6B5E52] flex-1"
                      />
                      {hasApiKey && (
                        <Button
                          onClick={() => {
                            setIsEditingApiKey(false);
                            setApiKey('');
                            setApiKeyError('');
                          }}
                          variant="outline"
                          className="bg-[#261B0E]/80 border-[#3D2E1A] text-[#C4B8A8] hover:bg-[#3D2E1A]"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                    {hasApiKey && (
                      <p className="text-xs text-[#8B8070]">
                        Leave empty and click Cancel to keep your existing key
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-[#8B8070] mt-2">
                  Your API key is stored securely server-side.
                </p>
              </div>

              {apiKeyError && (
                <Alert className="bg-red-500/10 border-red-500/30">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-200">{apiKeyError}</AlertDescription>
                </Alert>
              )}

              {apiKeySuccess && (
                <Alert className="bg-green-500/10 border-green-500/30">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-200">
                    Configuration saved successfully!
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSaveApiKey}
                disabled={apiKeyLoading}
                className="bg-[#C5AA67] hover:bg-[#A8893F] text-[#0D0A06] border-0 w-full"
              >
                {apiKeyLoading ? (
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
