'use client';

import { SessionProvider } from 'next-auth/react';
import { PersonaProvider } from '@/contexts/PersonaContext';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Chrome extension type declarations
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (extensionId?: string, message?: any, callback?: (response: any) => void) => void;
        lastError?: { message: string };
      };
    };
  }
}

function SessionBridge() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      // Send session to extension
      if (typeof window !== 'undefined' && window.chrome?.runtime) {
        const extensionId = process.env.NEXT_PUBLIC_EXTENSION_ID;
        window.chrome.runtime.sendMessage(
          extensionId,
          {
            type: 'SET_USER_SESSION',
            data: {
              email: session.user.email,
              userId: session.user.id,
              name: session.user.name,
            },
          },
          (_response: any) => {
            if (window.chrome?.runtime?.lastError) {
              // Silently handle extension not installed or not accessible
            }
          }
        );
      }
    }
  }, [session, status]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PersonaProvider>
        <SessionBridge />
        {children}
      </PersonaProvider>
    </SessionProvider>
  );
}
