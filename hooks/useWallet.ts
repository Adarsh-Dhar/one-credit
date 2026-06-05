import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { WalletCard } from '@/lib/types';

export function useWallet() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wallet, setWallet] = useState(0);
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'loading') return;
    const email = session?.user?.email || 'demo@omniwallet.com';
    fetch(`/api/wallet?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => {
        setWallet(data.totalValue ?? 1500);
        setCards(data.cards ?? []);
      })
      .catch(() => setWallet(1500))
      .finally(() => setLoading(false));
  }, [session, status]);

  return { wallet, cards, loading, session };
}
