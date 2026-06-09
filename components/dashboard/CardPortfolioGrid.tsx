import { TiltCard } from '@/components/TiltCard';
import { WalletCard } from '@/lib/types';

interface CardPortfolioGridProps {
  cards: WalletCard[];
  loading: boolean;
  onCardClick: (card: WalletCard) => void;
}

export function CardPortfolioGrid({ cards, loading, onCardClick }: CardPortfolioGridProps) {
  const maxValue = Math.max(...cards.map(c => c.value || 0));

  return (
    <section className="mb-16">
      <h2 className="text-2xl font-bold text-[#E8D8B0] mb-6">Your Linked Cards</h2>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#1A1209]/80 border border-[#3D2E1A] rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-[#261B0E] rounded w-3/4 mb-4" />
              <div className="h-3 bg-[#261B0E] rounded w-1/2 mb-2" />
              <div className="h-3 bg-[#261B0E] rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const isTopCard = card.value === maxValue;
            return (
              <TiltCard
                key={card.key}
                card={card}
                isTopCard={isTopCard}
                onClick={() => onCardClick(card)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
