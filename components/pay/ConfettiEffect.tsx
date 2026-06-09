import { useEffect, useRef } from 'react';

const CONFETTI_CONSTANTS = {
  DURATION_MS: 2200,
  COLORS: ['#C5AA67', '#4ECDA4', '#E8A844', '#DCC98A', '#85DFC2'] as string[],
  PARTICLE_COUNT: 5,
  SPREAD: 55,
  ANGLE_1: 60,
  ANGLE_2: 120,
  ORIGIN_Y: 0.7,
  ORIGIN_X_START: 0,
  ORIGIN_X_END: 1,
} as const;

interface ConfettiEffectProps {
  trigger: boolean;
}

export function ConfettiEffect({ trigger }: ConfettiEffectProps) {
  const confettiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trigger) {
      return;
    }

    import('canvas-confetti').then((confettiModule) => {
      const confetti = confettiModule.default;
      const end = Date.now() + CONFETTI_CONSTANTS.DURATION_MS;
      const colors = CONFETTI_CONSTANTS.COLORS;
      const frame = () => {
        confetti({
          particleCount: CONFETTI_CONSTANTS.PARTICLE_COUNT,
          angle: CONFETTI_CONSTANTS.ANGLE_1,
          spread: CONFETTI_CONSTANTS.SPREAD,
          origin: { x: CONFETTI_CONSTANTS.ORIGIN_X_START, y: CONFETTI_CONSTANTS.ORIGIN_Y },
          colors,
        });
        confetti({
          particleCount: CONFETTI_CONSTANTS.PARTICLE_COUNT,
          angle: CONFETTI_CONSTANTS.ANGLE_2,
          spread: CONFETTI_CONSTANTS.SPREAD,
          origin: { x: CONFETTI_CONSTANTS.ORIGIN_X_END, y: CONFETTI_CONSTANTS.ORIGIN_Y },
          colors,
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }).catch(() => {
      // canvas-confetti not installed — skip silently
    });
  }, [trigger]);

  return <div ref={confettiRef} className="relative" />;
}
