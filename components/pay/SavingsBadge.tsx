import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

const BADGE_CONFIG = {
  BIG_SAVE_THRESHOLD: 50,
  ANIMATION_DELAY_BADGE: 0.5,
} as const;

interface SavingsBadgeProps {
  savedAmount: number;
  savedPercent: string;
  recommendation: {
    bestCard?: string;
  } | null;
}

export function SavingsBadge({ savedAmount, savedPercent, recommendation }: SavingsBadgeProps) {
  const bigSave = savedAmount >= BADGE_CONFIG.BIG_SAVE_THRESHOLD;

  if (savedAmount <= 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: BADGE_CONFIG.ANIMATION_DELAY_BADGE }}
      className={`flex items-center gap-2 rounded-xl p-3 ${
        bigSave
          ? 'bg-[#E8A844]/10 border border-[#E8A844]/30'
          : 'bg-[#4ECDA4]/10 border-[#4ECDA4]/20'
      }`}
    >
      <Trophy className={`w-5 h-5 shrink-0 ${bigSave ? 'text-[#E8A844]' : 'text-[#4ECDA4]'}`} />
      <p className={`text-sm font-semibold ${bigSave ? 'text-[#DCC98A]' : 'text-[#85DFC2]'}`}>
        {recommendation?.bestCard ?? 'AI'} saved you{' '}
        <span className="font-extrabold">${savedAmount.toFixed(2)}</span>{' '}
        ({savedPercent}%) by routing through your rewards!
      </p>
    </motion.div>
  );
}
