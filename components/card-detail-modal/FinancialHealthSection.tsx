import { DollarSign } from 'lucide-react';
import { IFiatCard } from '@/lib/models/FiatCard';

interface FinancialHealthSectionProps {
  cardDetails: IFiatCard;
}

export function FinancialHealthSection({ cardDetails }: FinancialHealthSectionProps) {
  const utilizationPct = cardDetails.credit_limit
    ? ((cardDetails.current_balance_owed || 0) / cardDetails.credit_limit * 100).toFixed(1)
    : '0';

  return (
    <div>
      <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-green-400" />
        Financial Health
      </h4>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Current Balance Owed</p>
          <p className="text-white font-bold text-xl">${cardDetails.current_balance_owed?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Credit Limit</p>
          <p className="text-white font-bold text-xl">${cardDetails.credit_limit?.toLocaleString() || 'N/A'}</p>
        </div>
      </div>

      {cardDetails.credit_limit && (
        <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
          <div className="flex justify-between mb-2">
            <p className="text-slate-400 text-sm">Credit Limit Utilization</p>
            <p className="text-white font-bold text-sm">{utilizationPct}%</p>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-500 to-yellow-500 h-3 rounded-full transition-all"
              style={{ width: `${Math.min(parseFloat(utilizationPct), 100)}%` }}
            />
          </div>
          <p className="text-slate-400 text-xs mt-1">
            ${cardDetails.current_balance_owed?.toFixed(2) || '0.00'} / ${cardDetails.credit_limit?.toLocaleString()}
          </p>
        </div>
      )}

      {cardDetails.financials.promos?.intro_purchase_apr_expiration && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <div>
              <p className="text-yellow-300 font-semibold text-sm">0% APR Promo Expiring Soon</p>
              <p className="text-slate-300 text-xs mt-1">
                Expires: {new Date(cardDetails.financials.promos.intro_purchase_apr_expiration).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
