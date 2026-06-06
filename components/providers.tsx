'use client';

import { SessionProvider } from 'next-auth/react';
import { PersonaProvider } from '@/contexts/PersonaContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PersonaProvider>
        {children}
      </PersonaProvider>
    </SessionProvider>
  );
}
