import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { WalletCard } from '@/lib/types';

interface TiltCardProps {
  card: WalletCard;
  isTopCard: boolean;
  onClick?: () => void;
}

const ANIMATION_CONFIG = {
  stiffness: 300,
  damping: 30,
  rotateRange: 15,
  shineStart: '50%',
  shineEnd: '0%',
} as const;

export function TiltCard({ card, isTopCard, onClick }: TiltCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: ANIMATION_CONFIG.stiffness, damping: ANIMATION_CONFIG.damping });
  const mouseY = useSpring(y, { stiffness: ANIMATION_CONFIG.stiffness, damping: ANIMATION_CONFIG.damping });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [ANIMATION_CONFIG.rotateRange, -ANIMATION_CONFIG.rotateRange]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-ANIMATION_CONFIG.rotateRange, ANIMATION_CONFIG.rotateRange]);

  const shineX = useTransform(mouseX, [-0.5, 0.5], [ANIMATION_CONFIG.shineStart, ANIMATION_CONFIG.shineEnd]);
  const shineY = useTransform(mouseY, [-0.5, 0.5], [ANIMATION_CONFIG.shineStart, ANIMATION_CONFIG.shineEnd]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXVal = (e.clientX - rect.left) / width - 0.5;
    const mouseYVal = (e.clientY - rect.top) / height - 0.5;
    x.set(mouseXVal);
    y.set(mouseYVal);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  // Get top 3 earn rates
  const earnRates = card.earnRates ? Object.entries(card.earnRates)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3) : [];

  return (
    <motion.div
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className="relative cursor-pointer"
    >
      {/* Gradient border for top card */}
      {isTopCard && (
        <div
          className="absolute inset-0 rounded-xl blur-md opacity-70"
          style={{
            background: 'linear-gradient(45deg, #C5AA67, #4ECDA4, #C5AA67)',
            backgroundSize: '300% 300%',
            animation: 'gradientShift 3s ease infinite',
          }}
        />
      )}

      {/* Card content */}
      <motion.div
        className="relative bg-[#1A1209] border border-[#3D2E1A] rounded-xl p-6 overflow-hidden"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'translateZ(20px)',
        }}
      >
        {/* Specular highlight */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at var(--shine-x) var(--shine-y), rgba(255,255,255,0.15) 0%, transparent 50%)',
            '--shine-x': shineX,
            '--shine-y': shineY,
          } as React.CSSProperties}
        />

        {/* TOP VALUE badge */}
        {isTopCard && (
          <div className="absolute top-3 right-3 bg-[#C5AA67] text-[#0D0A06] text-xs font-bold px-2 py-1 rounded-full">
            TOP VALUE
          </div>
        )}

        {/* Card info */}
        <div className="relative z-10">
          {/* Card image */}
          {card.cardImageUrl && (
            <div className="mb-3 flex justify-center">
              <img
                src={card.cardImageUrl}
                alt={card.name}
                className="h-20 w-auto rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <p className="text-[#8B8070] text-xs mb-1">{card.issuer}</p>
          <p className="text-[#E8D8B0] font-bold text-lg mb-4">{card.name}</p>

          <div className="mb-4">
            <p className="text-[#6B5E52] text-xs">Balance (USD)</p>
            <p className="text-[#C5AA67] font-bold text-2xl">
              ${Math.round(card.value || 0).toLocaleString()}
            </p>
          </div>

          {/* Earn rate chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {earnRates.map(([category, rate]) => (
              <span
                key={category as string}
                className="text-xs bg-[#261B0E] text-[#C4B8A8] px-2 py-1 rounded"
              >
                {category as string} {rate as number}×
              </span>
            ))}
          </div>

          {/* Primary perk */}
          <div className="text-[#8B8070] text-xs border-t border-[#3D2E1A] pt-3">
            {card.perks?.[0] || 'No perks listed'}
          </div>
        </div>
      </motion.div>

    </motion.div>
  );
}
