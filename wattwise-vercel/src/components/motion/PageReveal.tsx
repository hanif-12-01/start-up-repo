'use client';

import { useRef } from 'react';
import { useGSAP } from '@/lib/motion/gsap';
import { motionPresets } from '@/lib/motion/presets';
import { usePrefersReducedMotion } from '@/lib/motion/reduced-motion';

interface PageRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function PageReveal({ children, className = '', delay = 0 }: PageRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isReduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (isReduced || !containerRef.current) return;
      motionPresets.pageEntrance(containerRef.current, { delay });
    },
    { scope: containerRef, dependencies: [isReduced, delay] }
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
