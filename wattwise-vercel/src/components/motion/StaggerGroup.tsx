'use client';

import { useRef } from 'react';
import { useGSAP } from '@/lib/motion/gsap';
import { motionPresets } from '@/lib/motion/presets';
import { usePrefersReducedMotion } from '@/lib/motion/reduced-motion';

interface StaggerGroupProps {
  children: React.ReactNode;
  className?: string;
  childSelector?: string;
  stagger?: number;
  delay?: number;
}

export function StaggerGroup({
  children,
  className = '',
  childSelector = ':scope > *',
  stagger = 0.08,
  delay = 0,
}: StaggerGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isReduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (isReduced || !containerRef.current) return;
      const targets = containerRef.current.querySelectorAll(childSelector);
      if (targets.length === 0) return;
      motionPresets.staggerGroup(targets, { stagger, delay });
    },
    { scope: containerRef, dependencies: [isReduced, childSelector, stagger, delay] }
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
