import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const ANIMATION_CONFIG = {
  STIFFNESS: 300,
  DAMPING: 18,
  DELAY_SPRING: 0.1,
} as const;

interface ReceiptHeaderProps {
  merchant: string;
  amount: number;
}

export function ReceiptHeader({ merchant, amount }: ReceiptHeaderProps) {
  return (
    <div className="px-6 pt-6 pb-4 text-center border-b border-[#3D2E1A]/60">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: ANIMATION_CONFIG.STIFFNESS, damping: ANIMATION_CONFIG.DAMPING, delay: ANIMATION_CONFIG.DELAY_SPRING }}
        className="w-16 h-16 bg-[#4ECDA4]/15 border border-[#4ECDA4]/30 rounded-2xl flex items-center justify-center mx-auto mb-3"
      >
        <CheckCircle2 className="w-9 h-9 text-[#4ECDA4]" />
      </motion.div>
      <h2 className="text-2xl font-bold text-[#E8D8B0] tracking-tight">Payment Confirmed</h2>
      <p className="text-[#8B8070] text-sm mt-1">{merchant} · <span className="text-[#E8D8B0] font-medium">${amount.toFixed(2)}</span></p>
    </div>
  );
}
