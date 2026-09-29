// Type scale. Sizes are px, line heights are multiples of the size.

export const fontFamily =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export type TextStyle = {
  size: number;
  weight: number;
  lineHeight: number;
  /** In em, so it scales with the size. */
  letterSpacing: number;
};

export const typeScale = {
  display: { size: 34, weight: 700, lineHeight: 1.15, letterSpacing: -0.02 },
  title: { size: 22, weight: 600, lineHeight: 1.25, letterSpacing: -0.01 },
  body: { size: 17, weight: 400, lineHeight: 1.5, letterSpacing: 0 },
  caption: { size: 13, weight: 500, lineHeight: 1.35, letterSpacing: 0.01 },
} as const satisfies Record<string, TextStyle>;

export type TypeKey = keyof typeof typeScale;
