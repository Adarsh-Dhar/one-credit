import { Sparkles } from 'lucide-react';

interface ReceiptLineItemsProps {
  recommendation: {
    nativeReward?: number;
    rewardRate?: number;
    bestCard?: string;
    offerFound?: boolean;
    offerSource?: string;
    reasoning?: string;
  } | null;
  txHash: string;
}

export function ReceiptLineItems({ recommendation, txHash }: ReceiptLineItemsProps) {
  return (
    <>
      <div className="px-6 py-4 space-y-3 border-b border-[#3D2E1A]/60">
        <div className="flex justify-between text-sm">
          <span className="text-[#8B8070]">USD Earned</span>
          <span className="text-[#C5AA67] font-bold">+${recommendation?.nativeReward?.toFixed(2)} USD</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#8B8070]">Reward Rate</span>
          <span className="text-[#E8D8B0]">{((recommendation?.rewardRate ?? 0) * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#8B8070]">Card Used</span>
          <span className="text-[#E8D8B0] truncate max-w-45 text-right">{recommendation?.bestCard}</span>
        </div>
        {recommendation?.offerFound && (
          <div className="flex justify-between text-sm">
            <span className="text-[#8B8070]">Offer Source</span>
            <span className="text-[#4ECDA4] capitalize">{recommendation.offerSource}</span>
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-b border-[#3D2E1A]/60">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#6B5E52]">Tx Hash</span>
          <span className="text-[#6B5E52] font-mono">{txHash}</span>
        </div>
      </div>

      {recommendation?.reasoning && (
        <div className="px-6 py-3 border-b border-[#3D2E1A]/60">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[#C5AA67] mt-0.5 shrink-0" />
            <p className="text-[#8B8070] text-xs leading-relaxed italic">{recommendation.reasoning}</p>
          </div>
        </div>
      )}
    </>
  );
}
