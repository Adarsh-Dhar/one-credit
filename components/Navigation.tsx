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
    <nav className="bg-[#0D0A06]/95 backdrop-blur-md border-b border-[#3D2E1A]/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 pt-4 pb-2">
            <Image
              src="/Firefly.png"
              alt="Delphi"
              width={100}
              height={30}
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" className={`text-[#C4B8A8] hover:text-[#E8D8B0] ${pathname === '/' ? 'text-[#E8D8B0] bg-[#261B0E]/80 rounded' : ''}`}>
                Dashboard
              </Button>
            </Link>
            <Link href="/cards">
              <Button variant="ghost" className={`text-[#C4B8A8] hover:text-[#E8D8B0] ${pathname === '/cards' ? 'text-[#E8D8B0] bg-[#261B0E]/80 rounded' : ''}`}>
                Cards
              </Button>
            </Link>
            <Link href="/offers">
              <Button variant="ghost" className={`text-[#C4B8A8] hover:text-[#E8D8B0] ${pathname === '/offers' ? 'text-[#E8D8B0] bg-[#261B0E]/80 rounded' : ''}`}>
                Offers
              </Button>
            </Link>
            <Link href="/insights">
              <Button variant="ghost" className={`text-[#C4B8A8] hover:text-[#E8D8B0] ${pathname === '/insights' ? 'text-[#E8D8B0] bg-[#261B0E]/80 rounded' : ''}`}>
                Insights
              </Button>
            </Link>
            <Link href="/pay">
              <Button variant="ghost" className={`text-[#C4B8A8] hover:text-[#E8D8B0] ${pathname === '/pay' ? 'text-[#E8D8B0] bg-[#261B0E]/80 rounded' : ''}`}>
                Pay
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8B8070] hidden sm:inline">{session?.user?.email || 'Not logged in'}</span>
            {session && (
              <Button
                variant="ghost"
                size="icon"
                className="text-[#C4B8A8] hover:text-[#E8D8B0]"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            )}
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="text-[#C4B8A8] hover:text-[#E8D8B0]">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-[#C4B8A8] hover:text-[#E8D8B0]"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link href="/">
              <Button variant="ghost" className={`w-full justify-start text-[#C4B8A8] ${pathname === '/' ? 'text-[#E8D8B0] bg-[#261B0E]/80 rounded' : ''}`}>
                Dashboard
              </Button>
            </Link>
            <Link href="/cards">
              <Button variant="ghost" className={`w-full justify-start text-[#C4B8A8] ${pathname === '/cards' ? 'text-[#E8D8B0] bg-[#261B0E]/80 rounded' : ''}`}>
                Cards
              </Button>
            </Link>
            <Link href="/offers">
              <Button variant="ghost" className={`w-full justify-start text-[#C4B8A8] ${pathname === '/offers' ? 'text-[#E8D8B0] bg-[#261B0E]/80 rounded' : ''}`}>
                Offers
              </Button>
            </Link>
            <Link href="/insights">
              <Button variant="ghost" className={`w-full justify-start text-[#C4B8A8] ${pathname === '/insights' ? 'text-[#E8D8B0] bg-[#261B0E]/80 rounded' : ''}`}>
                Insights
              </Button>
            </Link>
            <Link href="/pay">
              <Button variant="ghost" className={`w-full justify-start text-[#C4B8A8] ${pathname === '/pay' ? 'text-[#E8D8B0] bg-[#261B0E]/80 rounded' : ''}`}>
                Pay
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
