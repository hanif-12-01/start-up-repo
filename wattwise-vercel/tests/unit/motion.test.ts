import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { motionTokens } from '../../src/lib/motion/tokens';
import { motionPresets } from '../../src/lib/motion/presets';
import { isReducedMotionPreferred } from '../../src/lib/motion/reduced-motion';

describe('Motion Tokens', () => {
  it('defines restrained motion token durations', () => {
    expect(motionTokens.duration.fast).toBe(0.18);
    expect(motionTokens.duration.normal).toBe(0.35);
    expect(motionTokens.duration.slow).toBe(0.55);
  });

  it('defines restrained motion distances in px', () => {
    expect(motionTokens.distance.xs).toBe(8);
    expect(motionTokens.distance.sm).toBe(16);
    expect(motionTokens.distance.md).toBe(24);
  });

  it('defines standard easing functions', () => {
    expect(motionTokens.ease.enter).toBe('power2.out');
    expect(motionTokens.ease.exit).toBe('power2.in');
    expect(motionTokens.ease.emphasized).toBe('power3.out');
  });

  it('defines tight and normal stagger delays', () => {
    expect(motionTokens.stagger.tight).toBe(0.05);
    expect(motionTokens.stagger.normal).toBe(0.08);
  });
});

describe('Reduced Motion Helper', () => {
  let originalWindow: unknown;

  beforeEach(() => {
    originalWindow = global.window;
  });

  afterEach(() => {
    if (originalWindow !== undefined) {
      global.window = originalWindow as typeof window;
    } else {
      // @ts-expect-error cleanup window
      delete global.window;
    }
  });

  it('returns false when window or matchMedia is not available (SSR safe)', () => {
    // @ts-expect-error simulating SSR
    delete global.window;

    expect(isReducedMotionPreferred()).toBe(false);
  });

  it('returns true when prefers-reduced-motion: reduce matches', () => {
    global.window = {
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    } as unknown as typeof window;

    expect(isReducedMotionPreferred()).toBe(true);
  });

  it('returns false when prefers-reduced-motion: reduce does not match', () => {
    global.window = {
      matchMedia: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    } as unknown as typeof window;

    expect(isReducedMotionPreferred()).toBe(false);
  });
});

describe('Motion Presets Safe Fallback under Reduced Motion', () => {
  let originalWindow: unknown;

  beforeEach(() => {
    originalWindow = global.window;
    global.window = {
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    } as unknown as typeof window;
  });

  afterEach(() => {
    if (originalWindow !== undefined) {
      global.window = originalWindow as typeof window;
    } else {
      // @ts-expect-error cleanup window
      delete global.window;
    }
  });

  it('bypasses pageEntrance animation when reduced motion is enabled', () => {
    const dummyTarget = {} as unknown as HTMLElement;
    const result = motionPresets.pageEntrance(dummyTarget);
    expect(result).toBeUndefined();
  });

  it('bypasses reveal animation when reduced motion is enabled', () => {
    const dummyTarget = {} as unknown as HTMLElement;
    const result = motionPresets.reveal(dummyTarget);
    expect(result).toBeUndefined();
  });

  it('bypasses staggerGroup animation when reduced motion is enabled', () => {
    const dummyTarget = {} as unknown as HTMLElement;
    const result = motionPresets.staggerGroup(dummyTarget);
    expect(result).toBeUndefined();
  });

  it('bypasses button hover/reset animations when reduced motion is enabled', () => {
    const dummyTarget = {} as unknown as HTMLElement;
    expect(motionPresets.buttonHover(dummyTarget)).toBeUndefined();
    expect(motionPresets.buttonReset(dummyTarget)).toBeUndefined();
  });
});
