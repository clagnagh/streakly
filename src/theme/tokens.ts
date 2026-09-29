// Design tokens that are the same in every theme. Colours live in themes.ts.
// Pages and components never use these numbers directly: they use the CSS
// variables built from them in cssVars.ts, e.g. var(--space-lg).

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

/** Animation durations in milliseconds. */
export const durations = {
  fast: 120,
  normal: 220,
  slow: 400,
} as const;

export const easings = {
  /** Most movement: starts quickly, settles gently. */
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  /** A small overshoot, for "pop" moments like completing a habit. */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

/** Fixed sizes in px. */
export const sizes = {
  /** Smallest tap area for any control (Apple and Google both say 44). */
  minTap: 44,
  tabBar: 64,
  /** Widest the main content column gets on big screens. */
  contentMax: 640,
  /** Hairline borders. */
  border: 1,
  /** Keyboard focus outline. */
  focusRing: 2,
} as const;

/** Screen widths in px where the layout changes. CSS can't read variables in
 * media queries, so components that need these use matchMedia in code. */
export const breakpoints = {
  desktop: 900,
} as const;

export type SpacingKey = keyof typeof spacing;
export type RadiusKey = keyof typeof radii;
export type DurationKey = keyof typeof durations;
