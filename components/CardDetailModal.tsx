import { X, DollarSign, Star, TrendingUp } from 'lucide-react';
import { CardDefinition } from '@/lib/cards';

interface CardDetailModalProps {
  selectedCard: CardDefinition;
  cardDetails: any;
  onClose: () => void;
}

export function CardDetailModal({ selectedCard, cardDetails, onClose }: CardDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700" role="dialog" aria-modal="true">
        {/* Modal Header */}
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

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Card Design Section */}
          {selectedCard.cardImageUrl && (
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
          )}

          {/* Section A: Financial Health */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Financial Health
            </h4>
            
            {/* Current Balance & Utilization */}
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

            {/* Credit Limit Utilization Bar */}
            {cardDetails.credit_limit && (
              <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                <div className="flex justify-between mb-2">
                  <p className="text-slate-400 text-sm">Credit Limit Utilization</p>
                  <p className="text-white font-bold text-sm">
                    {((cardDetails.current_balance_owed || 0) / cardDetails.credit_limit * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-yellow-500 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(((cardDetails.current_balance_owed || 0) / cardDetails.credit_limit * 100), 100)}%` }}
                  />
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  ${cardDetails.current_balance_owed?.toFixed(2) || '0.00'} / ${cardDetails.credit_limit?.toLocaleString()}
                </p>
              </div>
            )}

            {/* Active Warnings - Intro APR Expiration */}
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

          {/* Section B: Reward Engine */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Reward Engine
            </h4>

            {/* Available Rewards */}
            <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
              <p className="text-slate-400 text-sm mb-1">Available Rewards</p>
              <p className="text-white font-bold text-2xl">
                ${cardDetails.credit_token_balance?.toFixed(2) || '0.00'}
              </p>
              <p className="text-slate-400 text-xs mt-1">Synthetic value</p>
            </div>

            {/* Points Balance for Points Cards */}
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

            {/* Unused Statement Credits */}
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

          {/* Section C: Smart Cap Trackers */}
          {cardDetails.rewards_structure.fixed_categories && cardDetails.rewards_structure.fixed_categories.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                Smart Cap Trackers
              </h4>
              <div className="space-y-3">
                {cardDetails.rewards_structure.fixed_categories.map((cat: any, idx: number) => (
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
                            style={{ 
                              width: `${Math.min(((cat.current_spend_towards_cap || 0) / cat.cap_amount_usd * 100), 100)}%` 
                            }}
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
                ))}
              </div>
            </div>
          )}

          {/* Base Multiplier */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Base Multiplier</p>
            <p className="text-white font-bold text-2xl">{cardDetails.rewards_structure.base_multiplier}x</p>
            <p className="text-slate-400 text-xs mt-1">On all other purchases</p>
          </div>

          {/* Card Perks */}
          {cardDetails.benefits_and_credits.general_perks && cardDetails.benefits_and_credits.general_perks.length > 0 && (
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
          )}
        </div>
      </div>
    </div>
  );
}
