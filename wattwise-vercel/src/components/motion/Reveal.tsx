'use client';

import { useRef } from 'react';
import { useGSAP } from '@/lib/motion/gsap';
import { motionPresets } from '@/lib/motion/presets';
import { usePrefersReducedMotion } from '@/lib/motion/reduced-motion';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
}

export function Reveal({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  duration,
}: RevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isReduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (isReduced || !containerRef.current) return;
      motionPresets.reveal(containerRef.current, { direction, delay, duration });
    },
    { scope: containerRef, dependencies: [isReduced, direction, delay, duration] }
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
