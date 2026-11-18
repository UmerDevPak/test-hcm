/**
 * Standardized Framer Motion Presets for HCM Lite
 * Tuned with precise, physical spring dampening (no harsh snapping or generic CSS transitions).
 */

export const containerStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.018,
      delayChildren: 0,
    },
  },
};

export const itemFadeUp = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 550,
      damping: 34,
      mass: 0.6,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.12 },
  },
};

export const itemFadeLeft = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 520,
      damping: 32,
      mass: 0.6,
    },
  },
};

export const fadeInScale = {
  hidden: { opacity: 0, scale: 0.98 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 550,
      damping: 34,
      mass: 0.6,
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
 * Uses a low threshold so tall tables and cards never stay hidden on narrow viewports.
 */
export const scrollViewport = {
  once: true,
  margin: "0px",
  amount: 0.02,
};
