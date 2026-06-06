'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { UserPersona } from '@/lib/rum-agent';

interface PersonaContextType {
  persona: UserPersona | null;
  setPersona: (persona: UserPersona | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const PersonaContext = createContext<PersonaContextType | undefined>(undefined);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<UserPersona | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <PersonaContext.Provider value={{ persona, setPersona, isLoading, setIsLoading }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const context = useContext(PersonaContext);
  if (context === undefined) {
    throw new Error('usePersona must be used within a PersonaProvider');
  }
  return context;
}
