import { Star } from 'lucide-react';
import { IFiatCard } from '@/lib/models/FiatCard';

interface RewardEngineSectionProps {
  cardDetails: IFiatCard;
}

export function RewardEngineSection({ cardDetails }: RewardEngineSectionProps) {
  return (
    <div>
      <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-400" />
        Reward Engine
      </h4>

      <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
        <p className="text-slate-400 text-sm mb-1">Available Rewards</p>
        <p className="text-white font-bold text-2xl">
          ${cardDetails.credit_token_balance?.toFixed(2) || '0.00'}
        </p>
        <p className="text-slate-400 text-xs mt-1">Synthetic value</p>
      </div>

      {cardDetails.points_balance && (
        <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
          <p className="text-slate-400 text-sm mb-1">Points Balance</p>
          <p className="text-white font-bold text-2xl">
            {cardDetails.points_balance.toLocaleString()} pts
          </p>
          {cardDetails.points_value_cents && (
            <p className="text-slate-400 text-xs mt-1">
              Redeemable at {cardDetails.points_value_cents}¢/pt
            </p>
          )}
        </div>
      )}

      {cardDetails.benefits_and_credits.statement_credits && cardDetails.benefits_and_credits.statement_credits.length > 0 && (
        <div className="space-y-2">
          <p className="text-slate-400 text-sm mb-2">Unused Statement Credits</p>
          {cardDetails.benefits_and_credits.statement_credits.map((credit: any, idx: number) => (
            <div
              key={idx}
              className={`rounded-lg p-4 flex justify-between items-center ${
                credit.amount_redeemed === 0
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-slate-700/50'
              }`}
            >
              <div>
                <p className="text-white font-medium">{credit.name}</p>
                <p className="text-slate-400 text-xs">Resets: {credit.reset_period}</p>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-bold">${credit.amount_usd}</p>
                {credit.amount_redeemed === 0 && (
                  <p className="text-green-400 text-xs">Ready to Use</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
