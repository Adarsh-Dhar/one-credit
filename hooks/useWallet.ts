import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { WalletCard } from '@/lib/types';
import logger from '@/lib/logger';

export function useWallet() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wallet, setWallet] = useState(0);
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    const userId = session?.user?.id;
    if (userId) {
      setError(null);
      fetch(`/api/wallet?userId=${encodeURIComponent(userId)}`)
        .then((r) => r.json())
        .then((data) => {
          setWallet(data.totalValue ?? 1500);
          setCards(data.cards ?? []);
        })
        .catch((err) => {
          logger.error({ err }, '[useWallet] fetch failed')
          setError('Failed to load wallet. Please refresh.')
        })
        .finally(() => setLoading(false));
    }
  }, [session, status]);

  return { wallet, cards, loading, error, session };
}
