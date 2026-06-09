'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Navigation } from '@/components/Navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Sparkles, CreditCard, Package } from 'lucide-react';

interface Product {
  name: string;
  price: number;
  category?: string;
  merchant?: string;
  url?: string;
}

interface CardDetails {
  cardKey: string;
  name: string;
  issuer: string;
  rewardType: 'points' | 'miles' | 'cashback';
  pointsEarned?: number;
  rewardValueUsd?: number;
  netCost?: number;
}

export default function ExtensionPaymentPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [card, setCard] = useState<CardDetails | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<any>(null);

  useEffect(() => {
    // Parse URL parameters
    const productName = searchParams.get('productName');
    const productPrice = searchParams.get('productPrice');
    const category = searchParams.get('category');
    const merchant = searchParams.get('merchant');
    const productUrl = searchParams.get('url');
    
    const cardKey = searchParams.get('cardKey');
    const cardName = searchParams.get('cardName');
    const cardIssuer = searchParams.get('cardIssuer');
    const rewardType = searchParams.get('rewardType') as 'points' | 'miles' | 'cashback';
    const pointsEarned = searchParams.get('pointsEarned');
    const rewardValueUsd = searchParams.get('rewardValueUsd');
    const netCost = searchParams.get('netCost');

    if (productName && productPrice) {
      setProduct({
        name: productName,
        price: parseFloat(productPrice),
        category: category || undefined,
        merchant: merchant || undefined,
        url: productUrl || undefined,
      });
    }

    if (cardKey && cardName) {
      setCard({
        cardKey,
        name: cardName,
        issuer: cardIssuer || '',
        rewardType,
        pointsEarned: pointsEarned ? parseFloat(pointsEarned) : undefined,
        rewardValueUsd: rewardValueUsd ? parseFloat(rewardValueUsd) : undefined,
        netCost: netCost ? parseFloat(netCost) : undefined,
      });
    }
  }, [searchParams]);

  const handlePayment = async () => {
    if (!userId || !card || !product) {
      setError('Missing required information');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/extension/confirm-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: card.cardKey,
          product: {
            name: product.name,
            price: product.price,
            category: product.category,
            merchant: product.merchant,
            url: product.url,
            isEmi: false,
            isForeignMerchant: false,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      setTransaction(data.transaction);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const fmtUsd = (n: number) => '$' + n.toFixed(2);

  if (!product || !card) {
    return (
      <div className="min-h-screen bg-[#0D0A06] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#C5AA67] animate-spin mx-auto mb-4" />
          <p className="text-[#C4B8A8]">Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0A06]">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-[#E8D8B0] mb-2">Complete Payment</h1>
                <p className="text-[#8B8070]">Review and confirm your transaction</p>
              </div>

              {/* Product Card */}
              <div className="bg-[#1A1209] border border-[#3D2E1A] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#C5AA67]/20 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-[#C5AA67]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#8B8070]">Product</p>
                    <p className="text-[#E8D8B0] font-semibold">{product.name}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8B8070]">Price</span>
                    <span className="text-[#E8D8B0] font-bold">{fmtUsd(product.price)}</span>
                  </div>
                  {product.merchant && (
                    <div className="flex justify-between">
                      <span className="text-[#8B8070]">Merchant</span>
                      <span className="text-[#C4B8A8]">{product.merchant}</span>
                    </div>
                  )}
                  {product.category && (
                    <div className="flex justify-between">
                      <span className="text-[#8B8070]">Category</span>
                      <span className="text-[#C4B8A8] capitalize">{product.category}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Card */}
              <div className="bg-[#1A1209] border border-[#C5AA67]/40 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#C5AA67]/20 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-[#C5AA67]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#8B8070]">Selected Card</p>
                    <p className="text-[#E8D8B0] font-semibold">{card.name}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8B8070]">Issuer</span>
                    <span className="text-[#C4B8A8]">{card.issuer}</span>
                  </div>
                  {card.pointsEarned && (
                    <div className="flex justify-between">
                      <span className="text-[#8B8070]">Points Earned</span>
                      <span className="text-[#4ECDA4] font-bold">{card.pointsEarned.toLocaleString()} pts</span>
                    </div>
                  )}
                  {card.rewardValueUsd && (
                    <div className="flex justify-between">
                      <span className="text-[#8B8070]">Reward Value</span>
                      <span className="text-[#4ECDA4] font-bold">{fmtUsd(card.rewardValueUsd)}</span>
                    </div>
                  )}
                  {card.netCost && (
                    <div className="flex justify-between pt-2 border-t border-[#3D2E1A]">
                      <span className="text-[#8B8070]">Net Cost</span>
                      <span className="text-[#C5AA67] font-bold text-lg">{fmtUsd(card.netCost)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Payment Button */}
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-[#C5AA67] hover:bg-[#A8893F] text-[#0D0A06] font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C5AA67]/25 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Complete Payment - {fmtUsd(product.price)}
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6"
            >
              {/* Success Icon */}
              <div className="w-24 h-24 bg-[#4ECDA4]/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-12 h-12 text-[#4ECDA4]" />
              </div>

              {/* Success Message */}
              <div>
                <h1 className="text-3xl font-bold text-[#E8D8B0] mb-2">Payment Successful!</h1>
                <p className="text-[#8B8070]">Your transaction has been completed</p>
              </div>

              {/* Transaction Details */}
              <div className="bg-[#1A1209] border border-[#3D2E1A] rounded-2xl p-6 text-left">
                <p className="text-xs text-[#8B8070] mb-4">Transaction Details</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8B8070]">Product</span>
                    <span className="text-[#C4B8A8]">{product.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8B8070]">Amount</span>
                    <span className="text-[#E8D8B0] font-bold">{fmtUsd(product.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8B8070]">Card Used</span>
                    <span className="text-[#C4B8A8]">{card.name}</span>
                  </div>
                  {transaction && (
                    <>
                      {transaction.pointsEarned > 0 && (
                        <div className="flex justify-between">
                          <span className="text-[#8B8070]">Points Earned</span>
                          <span className="text-[#4ECDA4] font-bold">{transaction.pointsEarned.toLocaleString()} pts</span>
                        </div>
                      )}
                      {transaction.rewardValueUsd > 0 && (
                        <div className="flex justify-between">
                          <span className="text-[#8B8070]">Reward Value</span>
                          <span className="text-[#4ECDA4] font-bold">{fmtUsd(transaction.rewardValueUsd)}</span>
                        </div>
                      )}
                      <div className="pt-3 border-t border-[#3D2E1A]">
                        <div className="flex justify-between">
                          <span className="text-[#8B8070]">Transaction ID</span>
                          <span className="text-[#6B5E52] text-xs font-mono">{transaction.id}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Done Button */}
              <button
                onClick={() => window.close()}
                className="w-full bg-[#261B0E] hover:bg-[#3D2E1A] text-[#E8D8B0] font-bold py-4 rounded-xl transition-all"
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
