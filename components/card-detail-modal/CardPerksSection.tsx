import { IFiatCard } from '@/lib/models/FiatCard';

interface CardPerksSectionProps {
  cardDetails: IFiatCard;
}

export function CardPerksSection({ cardDetails }: CardPerksSectionProps) {
  if (!cardDetails.benefits_and_credits.general_perks || cardDetails.benefits_and_credits.general_perks.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="text-lg font-semibold text-white mb-3">Card Perks</h4>
      <div className="space-y-2">
        {cardDetails.benefits_and_credits.general_perks.map((perk: string, idx: number) => (
          <div key={idx} className="bg-slate-700/50 rounded-lg p-3 text-white text-sm">
            {perk}
          </div>
        ))}
      </div>
    </div>
  );
}
