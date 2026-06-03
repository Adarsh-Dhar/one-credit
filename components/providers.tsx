'use client';

import { SessionProvider } from 'next-auth/react';
import { ExtensionSessionBridge } from './ExtensionSessionBridge';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ExtensionSessionBridge />
      {children}
    </SessionProvider>
  );
}
