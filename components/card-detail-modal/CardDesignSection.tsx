import { CardDefinition } from '@/lib/cards';

interface CardDesignSectionProps {
  selectedCard: CardDefinition;
}

export function CardDesignSection({ selectedCard }: CardDesignSectionProps) {
  if (!selectedCard.cardImageUrl) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-center mb-4">
        <img
          src={selectedCard.cardImageUrl}
          alt={selectedCard.name}
          className="h-48 w-auto rounded-lg shadow-lg"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      {selectedCard.cardDescription && (
        <p className="text-slate-300 text-sm mb-4">{selectedCard.cardDescription}</p>
      )}
      {selectedCard.features && selectedCard.features.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-semibold text-white mb-2">Key Features</h5>
          <ul className="text-slate-300 text-sm space-y-1">
            {selectedCard.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-green-400 mt-1">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(selectedCard.pros && selectedCard.pros.length > 0) || (selectedCard.cons && selectedCard.cons.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {selectedCard.pros && selectedCard.pros.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <h5 className="text-sm font-semibold text-green-400 mb-2">Pros</h5>
              <ul className="text-slate-300 text-xs space-y-1">
                {selectedCard.pros.map((pro, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">+</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selectedCard.cons && selectedCard.cons.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <h5 className="text-sm font-semibold text-red-400 mb-2">Cons</h5>
              <ul className="text-slate-300 text-xs space-y-1">
                {selectedCard.cons.map((con, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">-</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
