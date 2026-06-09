'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from 'next-auth/react';

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/offers', label: 'Offers' },
  { href: '/insights', label: 'Insights' },
  { href: '/pay', label: 'Pay' },
];

function NavLink({ href, label, pathname, isMobile = false }: NavItem & { pathname: string; isMobile?: boolean }) {
  const isActive = pathname === href;
  const baseClasses = 'text-[#C4B8A8] hover:text-[#E8D8B0]';
  const activeClasses = isActive ? 'text-[#E8D8B0] bg-[#261B0E]/80 rounded' : '';
  const mobileClasses = isMobile ? 'w-full justify-start' : '';

  return (
    <Link href={href}>
      <Button variant="ghost" className={`${baseClasses} ${activeClasses} ${mobileClasses}`}>
        {label}
      </Button>
    </Link>
  );
}

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
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} />
            ))}
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
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} isMobile />
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
