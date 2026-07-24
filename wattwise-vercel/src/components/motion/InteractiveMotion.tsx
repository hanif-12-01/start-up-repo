'use client';

import { useRef } from 'react';
import { useGSAP } from '@/lib/motion/gsap';
import { motionPresets } from '@/lib/motion/presets';
import { usePrefersReducedMotion } from '@/lib/motion/reduced-motion';

interface InteractiveMotionProps {
  children: React.ReactNode;
  className?: string;
  hoverScale?: number;
  tapScale?: number;
}

export function InteractiveMotion({
  children,
  className = '',
}: InteractiveMotionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isReduced = usePrefersReducedMotion();

  const { contextSafe } = useGSAP({ scope: containerRef });

  const handleMouseEnter = contextSafe(() => {
    if (isReduced || !containerRef.current) return;
    motionPresets.buttonHover(containerRef.current);
  });

  const handleMouseLeave = contextSafe(() => {
    if (isReduced || !containerRef.current) return;
    motionPresets.buttonReset(containerRef.current);
  });

  return (
    <div
      ref={containerRef}
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
