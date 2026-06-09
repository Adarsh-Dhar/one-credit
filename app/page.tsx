'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { CardDetailModal } from '@/components/CardDetailModal';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { WalletOverview } from '@/components/dashboard/WalletOverview';
import { CardPortfolioGrid } from '@/components/dashboard/CardPortfolioGrid';
import { IntegrationStatus } from '@/components/dashboard/IntegrationStatus';
import { CoreFlowInfo } from '@/components/dashboard/CoreFlowInfo';
import { CardDefinition } from '@/lib/cards';
import { IFiatCard } from '@/lib/models/FiatCard';
import { WalletCard } from '@/lib/types';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { wallet, cards, loading, session } = useWallet();
  const { toast } = useToast();
  const [selectedCard, setSelectedCard] = useState<CardDefinition | null>(null)
  const [cardDetails, setCardDetails] = useState<IFiatCard | null>(null)

  const handleCardClick = async (card: WalletCard) => {
    setSelectedCard(card);
    const email = session?.user?.email;
    if (!email) {
      return;
    }
    try {
      const response = await fetch(`/api/fiat-cards?userId=${encodeURIComponent(email)}`);
      const data = await response.json();
      const fullCard = data.cards.find((c: IFiatCard) => c.card_id === card.key);
      setCardDetails(fullCard);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to fetch card details',
        variant: 'destructive',
      });
    }
  };

  const closeCardDetails = () => {
    setSelectedCard(null);
    setCardDetails(null);
  };

  // Scroll lock for modal
  useEffect(() => {
    if (selectedCard && cardDetails) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [selectedCard, cardDetails])

  return (
    <div className="min-h-screen bg-[#0D0A06]">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <DashboardHeader />
        <WalletOverview wallet={wallet} loading={loading} />
        <CardPortfolioGrid cards={cards} loading={loading} onCardClick={handleCardClick} />

        {/* Card Details Modal */}
        {selectedCard && cardDetails && (
          <CardDetailModal
            selectedCard={selectedCard}
            cardDetails={cardDetails}
            onClose={closeCardDetails}
          />
        )}

        <IntegrationStatus />
        <CoreFlowInfo />
      </main>
    </div>
  );
}
