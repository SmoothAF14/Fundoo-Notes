import type { Transition } from 'motion/react';

/** House easing: quick start, long gentle settle. */
export const EASE = [0.2, 0.7, 0.1, 1] as const;

export const pageMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: EASE } satisfies Transition,
};

export const springLayout: Transition = { type: 'spring', stiffness: 420, damping: 38, mass: 0.8 };
