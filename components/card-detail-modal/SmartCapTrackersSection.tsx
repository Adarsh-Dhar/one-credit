import { TrendingUp } from 'lucide-react';
import { IFiatCard } from '@/lib/models/FiatCard';

interface SmartCapTrackersSectionProps {
  cardDetails: IFiatCard;
}

export function SmartCapTrackersSection({ cardDetails }: SmartCapTrackersSectionProps) {
  if (!cardDetails.rewards_structure.fixed_categories || cardDetails.rewards_structure.fixed_categories.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-purple-400" />
        Smart Cap Trackers
      </h4>
      <div className="space-y-3">
        {cardDetails.rewards_structure.fixed_categories.map((cat: any, idx: number) => {
          const progressPct = cat.cap_amount_usd
            ? Math.min(((cat.current_spend_towards_cap || 0) / cat.cap_amount_usd * 100), 100)
            : 0;

          return (
            <div key={idx} className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="text-white font-medium">{cat.category}</p>
                  <p className="text-green-400 font-bold text-lg">{cat.multiplier}x Points</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs">Progress</p>
                  <p className="text-white font-bold text-sm">
                    ${cat.current_spend_towards_cap?.toLocaleString() || '0'} / ${cat.cap_amount_usd?.toLocaleString() || '∞'}
                  </p>
                </div>
              </div>
              {cat.cap_amount_usd && (
                <>
                  <div className="w-full bg-slate-600 rounded-full h-2 mb-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-yellow-500 h-2 rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-slate-400 text-xs">
                    {cat.cap_period && `Resets: ${cat.cap_period}`}
                  </p>
                  {cat.current_spend_towards_cap >= cat.cap_amount_usd && (
                    <div className="mt-2 bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                      <p className="text-yellow-300 text-xs">
                        ⚠️ Cap reached! Omni-Wallet will route future {cat.category.toLowerCase()} purchases to your next best card.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
