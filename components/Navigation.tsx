'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from 'next-auth/react';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <nav className="bg-slate-900/50 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/Firefly.png"
              alt="Delphi"
              width={120}
              height={36}
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" className={`text-slate-300 hover:text-white ${pathname === '/' ? 'text-white bg-slate-700/50 rounded' : ''}`}>
                Dashboard
              </Button>
            </Link>
            <Link href="/cards">
              <Button variant="ghost" className={`text-slate-300 hover:text-white ${pathname === '/cards' ? 'text-white bg-slate-700/50 rounded' : ''}`}>
                Cards
              </Button>
            </Link>
            <Link href="/offers">
              <Button variant="ghost" className={`text-slate-300 hover:text-white ${pathname === '/offers' ? 'text-white bg-slate-700/50 rounded' : ''}`}>
                Offers
              </Button>
            </Link>
            <Link href="/insights">
              <Button variant="ghost" className={`text-slate-300 hover:text-white ${pathname === '/insights' ? 'text-white bg-slate-700/50 rounded' : ''}`}>
                Insights
              </Button>
            </Link>
            <Link href="/pay">
              <Button variant="ghost" className={`text-slate-300 hover:text-white ${pathname === '/pay' ? 'text-white bg-slate-700/50 rounded' : ''}`}>
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
              <Button variant="ghost" className={`w-full justify-start text-slate-300 ${pathname === '/' ? 'text-white bg-slate-700/50 rounded' : ''}`}>
                Dashboard
              </Button>
            </Link>
            <Link href="/cards">
              <Button variant="ghost" className={`w-full justify-start text-slate-300 ${pathname === '/cards' ? 'text-white bg-slate-700/50 rounded' : ''}`}>
                Cards
              </Button>
            </Link>
            <Link href="/offers">
              <Button variant="ghost" className={`w-full justify-start text-slate-300 ${pathname === '/offers' ? 'text-white bg-slate-700/50 rounded' : ''}`}>
                Offers
              </Button>
            </Link>
            <Link href="/insights">
              <Button variant="ghost" className={`w-full justify-start text-slate-300 ${pathname === '/insights' ? 'text-white bg-slate-700/50 rounded' : ''}`}>
                Insights
              </Button>
            </Link>
            <Link href="/pay">
              <Button variant="ghost" className={`w-full justify-start text-slate-300 ${pathname === '/pay' ? 'text-white bg-slate-700/50 rounded' : ''}`}>
                Pay
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
