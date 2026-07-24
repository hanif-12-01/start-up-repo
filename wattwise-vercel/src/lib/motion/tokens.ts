export const motionTokens = {
  duration: {
    fast: 0.18,
    normal: 0.35,
    slow: 0.55,
  },
  distance: {
    xs: 8,
    sm: 16,
    md: 24,
  },
  ease: {
    enter: 'power2.out',
    exit: 'power2.in',
    emphasized: 'power3.out',
  },
  stagger: {
    tight: 0.05,
    normal: 0.08,
  },
} as const;
