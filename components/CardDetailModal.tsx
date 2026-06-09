import { X } from 'lucide-react';
import { CardDefinition } from '@/lib/cards';
import { IFiatCard } from '@/lib/models/FiatCard';
import { useRUM, useDwellTime, useScrollDepth } from '@/hooks/useRUM';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { useEffect, useRef } from 'react';
import { CardDesignSection } from './card-detail-modal/CardDesignSection';
import { FinancialHealthSection } from './card-detail-modal/FinancialHealthSection';
import { RewardEngineSection } from './card-detail-modal/RewardEngineSection';
import { SmartCapTrackersSection } from './card-detail-modal/SmartCapTrackersSection';
import { LoungeAccessSection } from './card-detail-modal/LoungeAccessSection';
import { APRSection } from './card-detail-modal/APRSection';
import { CardPerksSection } from './card-detail-modal/CardPerksSection';

const MODAL_CONSTANTS = {
  SCROLL_DEPTH_PERCENTAGES: [25, 50, 75, 90, 100],
  Z_INDEX: 50,
  MAX_HEIGHT_VH: 90,
};

interface CardDetailModalProps {
  selectedCard: CardDefinition;
  cardDetails: IFiatCard | null;
  onClose: () => void;
}

export function CardDetailModal({ selectedCard, cardDetails, onClose }: CardDetailModalProps) {
  const { trackCardView, trackWalletAdd } = useRUM();
  const { startDwell: startLoungeDwell, endDwell: endLoungeDwell } = useDwellTime('loungeDetails');
  const { startDwell: startAprDwell, endDwell: endAprDwell } = useDwellTime('aprSection');
  const { startTracking: startScrollTracking, stopTracking: stopScrollTracking } = useScrollDepth(MODAL_CONSTANTS.SCROLL_DEPTH_PERCENTAGES);
  const loungeSectionRef = useRef<HTMLDivElement | null>(null);
  const aprSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    trackCardView(selectedCard.key);
  }, [selectedCard.key, trackCardView]);

  useIntersectionObserver({
    ref: loungeSectionRef,
    onIntersect: startLoungeDwell,
    onLeave: endLoungeDwell,
  });

  useIntersectionObserver({
    ref: aprSectionRef,
    onIntersect: startAprDwell,
    onLeave: endAprDwell,
  });

  useEffect(() => {
    startScrollTracking();
    return () => {
      stopScrollTracking();
    };
  }, [startScrollTracking, stopScrollTracking]);

  const handleAddToWallet = () => {
    trackWalletAdd(selectedCard.key);
  };

  if (!cardDetails) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700" role="dialog" aria-modal="true">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-white">{selectedCard.name}</h3>
            <p className="text-slate-400">{selectedCard.issuer}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <CardDesignSection selectedCard={selectedCard} />
          <FinancialHealthSection cardDetails={cardDetails} />
          <RewardEngineSection cardDetails={cardDetails} />
          <SmartCapTrackersSection cardDetails={cardDetails} />

          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Base Multiplier</p>
            <p className="text-white font-bold text-2xl">{cardDetails.rewards_structure.base_multiplier}x</p>
            <p className="text-slate-400 text-xs mt-1">On all other purchases</p>
          </div>

          <LoungeAccessSection loungeSectionRef={loungeSectionRef} />
          <APRSection aprSectionRef={aprSectionRef} />
          <CardPerksSection cardDetails={cardDetails} />

          <div className="mt-6 pt-6 border-t border-slate-700">
            <button
              onClick={handleAddToWallet}
              className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-yellow-600 transition-all"
            >
              Add to My Wallet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
