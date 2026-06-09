import { motion } from 'framer-motion';
import { CreditCard, ArrowRight } from 'lucide-react';

interface Merchant {
  name: string;
  logo: string;
  category: string;
}

interface TokenFlowAnimationProps {
  fromCard: string;
  toMerchant: Merchant;
  amount: number;
}

const ANIMATION_CONFIG = {
  particleCount: 6,
  duration: 1.2,
  repeatDelay: 0.2,
  particleSize: 8,
  gradientColors: ['#C5AA67', '#4ECDA4', '#C5AA67'],
  backgroundSize: '300% 300%',
  animationDuration: '3s',
  translateZ: '20px',
  blurAmount: 'sm',
  opacity: 0.6,
  glowOpacity: 0.6,
  glowShadow: '0_0_40px_rgba(197,170,103,0.6)',
  borderOpacity: 0.4,
  secondaryBorderOpacity: 0.8,
  secondaryOpacity: 0.8,
} as const;

export function TokenFlowAnimation({ fromCard, toMerchant, amount }: TokenFlowAnimationProps) {
  return (
    <div className="bg-[#0D0A06] border border-[#3D2E1A] rounded-2xl p-6 mb-5">
      <div className="flex items-center justify-between gap-4">

        {/* From: Card */}
        <div className="flex-1 relative">
          {/* Winner glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#C5AA67] via-[#4ECDA4] to-[#C5AA67] rounded-xl animate-pulse opacity-60 blur-sm" />
          <div className="relative bg-[#1A1209] rounded-xl p-4 text-center border border-[#C5AA67]/40 shadow-[0_0_40px_rgba(197,170,103,0.6)]">
            <CreditCard className="w-8 h-8 text-[#C5AA67] mx-auto mb-2" />
            <p className="text-[#E8D8B0] text-xs font-medium leading-tight">{fromCard}</p>
            <p className="text-[#6B5E52] text-xs mt-1">-${amount.toFixed(2)}</p>
          </div>
        </div>

        {/* Animated token flow */}
        <div className="flex items-center gap-1 relative w-16">
          <TokenParticles />
          <ArrowRight className="w-5 h-5 text-[#6B5E52]" />
          <span className="text-[#C5AA67] text-xs font-bold text-center">
            +${amount.toFixed(2)} USD
          </span>
        </div>

        {/* To: Merchant */}
        <div className="flex-1 bg-[#1A1209] rounded-xl p-4 text-center border border-[#4ECDA4]/40 opacity-80">
          <span className="text-4xl block mb-1">{toMerchant.logo}</span>
          <p className="text-[#E8D8B0] text-xs font-medium leading-tight">{toMerchant.name}</p>
          <p className="text-[#6B5E52] text-xs mt-1">${amount.toFixed(2)}</p>
        </div>

      </div>
    </div>
  );
}

function TokenParticles() {
  const particles = Array.from({ length: ANIMATION_CONFIG.particleCount }, (_, i) => i);
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {particles.map(i => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-[#C5AA67]"
          initial={{ x: -20, opacity: 0, scale: 0 }}
          animate={{
            x: [-20, 0, 20],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: ANIMATION_CONFIG.duration,
            repeat: Infinity,
            delay: i * ANIMATION_CONFIG.repeatDelay,
            ease: 'easeInOut',
          }}
          style={{ top: `${30 + (i % 3) * 15}%` }}
        />
      ))}
    </div>
  );
}
