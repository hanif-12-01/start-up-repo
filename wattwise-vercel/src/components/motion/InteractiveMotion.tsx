'use client';

import { motionPresets } from '@/lib/motion/presets';
import { usePrefersReducedMotion } from '@/lib/motion/reduced-motion';

interface InteractiveMotionProps {
  children: React.ReactNode;
  className?: string;
}

export function InteractiveMotion({ children, className = '' }: InteractiveMotionProps) {
  const isReduced = usePrefersReducedMotion();

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement> | React.FocusEvent<HTMLDivElement>) => {
    if (isReduced) return;
    motionPresets.buttonHover(e.currentTarget);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement> | React.FocusEvent<HTMLDivElement>) => {
    if (isReduced) return;
    motionPresets.buttonReset(e.currentTarget);
  };

  return (
    <div
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
    </div>
  );
}
