'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account');
      } else {
        router.push('/auth/signin');
      }
    } catch {
      toast({
        title: 'Signup Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0A06] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1A1209]/80 border-[#3D2E1A]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-[#E8D8B0]">Sign up</CardTitle>
          <CardDescription className="text-[#8B8070]">
            Create an account to get started with Omni-Wallet
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#C4B8A8]">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#0D0A06]/90 border-[#3D2E1A] text-[#E8D8B0] placeholder:text-[#6B5E52]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#C4B8A8]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[#0D0A06]/90 border-[#3D2E1A] text-[#E8D8B0] placeholder:text-[#6B5E52]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#C4B8A8]">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-[#0D0A06]/90 border-[#3D2E1A] text-[#E8D8B0] placeholder:text-[#6B5E52]"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-[#C5AA67] hover:bg-[#A8893F] text-[#0D0A06] font-semibold border-0"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </Button>
            <p className="text-sm text-[#8B8070] text-center">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-[#C5AA67] hover:text-[#DCC98A] underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
