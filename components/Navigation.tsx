'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Settings, LogOut, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from 'next-auth/react';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <nav className="bg-slate-900/50 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-yellow-400 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white text-sm">OW</span>
            </div>
            <span className="font-bold text-xl hidden sm:inline bg-gradient-to-r from-purple-400 to-yellow-300 bg-clip-text text-transparent">
              Omni-Wallet
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Dashboard
              </Button>
            </Link>
            <Link href="/cards">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Cards
              </Button>
            </Link>
            <Link href="/pay">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Pay
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 hidden sm:inline">{session?.user?.email || 'Not logged in'}</span>
            {session && (
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-300 hover:text-white"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            )}
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-slate-300 hover:text-white"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link href="/">
              <Button variant="ghost" className="w-full justify-start text-slate-300">
                Dashboard
              </Button>
            </Link>
            <Link href="/cards">
              <Button variant="ghost" className="w-full justify-start text-slate-300">
                Cards
              </Button>
            </Link>
            <Link href="/pay">
              <Button variant="ghost" className="w-full justify-start text-slate-300">
                Pay
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
