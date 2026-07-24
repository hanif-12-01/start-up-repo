import { gsap } from './gsap';
import { motionTokens } from './tokens';
import { isReducedMotionPreferred } from './reduced-motion';

export const motionPresets = {
  pageEntrance: (target: gsap.TweenTarget, options?: { delay?: number }) => {
    if (isReducedMotionPreferred()) return;
    return gsap.from(target, {
      opacity: 0,
      y: motionTokens.distance.sm,
      duration: motionTokens.duration.normal,
      delay: options?.delay ?? 0,
      ease: motionTokens.ease.enter,
      clearProps: 'opacity,transform',
    });
  },

  reveal: (
    target: gsap.TweenTarget,
    options?: { direction?: 'up' | 'down' | 'left' | 'right'; delay?: number; duration?: number }
  ) => {
    if (isReducedMotionPreferred()) return;

    let x = 0;
    let y = 0;
    const dist = motionTokens.distance.sm;

    switch (options?.direction) {
      case 'up':
        y = dist;
        break;
      case 'down':
        y = -dist;
        break;
      case 'left':
        x = dist;
        break;
      case 'right':
        x = -dist;
        break;
      default:
        y = dist;
    }

    return gsap.from(target, {
      opacity: 0,
      x,
      y,
      duration: options?.duration ?? motionTokens.duration.normal,
      delay: options?.delay ?? 0,
      ease: motionTokens.ease.enter,
      clearProps: 'opacity,transform',
    });
  },

  staggerGroup: (
    targets: gsap.TweenTarget,
    options?: { stagger?: number; delay?: number }
  ) => {
    if (isReducedMotionPreferred()) return;

    return gsap.from(targets, {
      opacity: 0,
      y: motionTokens.distance.sm,
      duration: motionTokens.duration.normal,
      delay: options?.delay ?? 0,
      stagger: options?.stagger ?? motionTokens.stagger.normal,
      ease: motionTokens.ease.enter,
      clearProps: 'opacity,transform',
    });
  },

  buttonHover: (target: gsap.TweenTarget) => {
    if (isReducedMotionPreferred()) return;

    return gsap.to(target, {
      scale: 1.02,
      duration: motionTokens.duration.fast,
      ease: motionTokens.ease.enter,
    });
  },

  buttonReset: (target: gsap.TweenTarget) => {
    if (isReducedMotionPreferred()) return;

    return gsap.to(target, {
      scale: 1,
      duration: motionTokens.duration.fast,
      ease: motionTokens.ease.exit,
      clearProps: 'transform',
    });
  },
};
