/**
 * Standardized Framer Motion Presets for HCM Lite
 * Tuned with precise, physical spring dampening (no harsh snapping or generic CSS transitions).
 */

export const containerStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
};

export const itemFadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.85,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.25 },
  },
};

export const itemFadeLeft = {
  hidden: { opacity: 0, x: -20 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.85,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const fadeInScale = {
  hidden: { opacity: 0, scale: 0.94 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.85,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const cardHoverSpring = {
  rest: { y: 0, transition: { type: "spring", stiffness: 450, damping: 28 } },
  hover: {
    y: -3,
    transition: { type: "spring", stiffness: 450, damping: 22 },
  },
  tap: {
    scale: 0.985,
    transition: { type: "spring", stiffness: 550, damping: 28 },
  },
};

export const springLayoutTransition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
};

/**
 * Standard Viewport Observer configuration for scroll-triggered entrance.
 * Uses a low threshold (0.05) so elements trigger smoothly as soon as they scroll into view.
 */
export const scrollViewport = {
  once: true,
  margin: "0px",
  amount: 0.05,
};
