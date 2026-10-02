// Type scale. Sizes are px, line heights are multiples of the size.

/** Nunito (bundled in public/fonts, SIL Open Font License), then system fonts while it loads. */
export const fontFamily =
  'Nunito, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export type TextStyle = {
  size: number;
  weight: number;
  lineHeight: number;
  /** In em, so it scales with the size. */
  letterSpacing: number;
};

export const typeScale = {
  display: { size: 34, weight: 800, lineHeight: 1.15, letterSpacing: -0.02 },
  title: { size: 22, weight: 700, lineHeight: 1.25, letterSpacing: -0.01 },
  body: { size: 17, weight: 500, lineHeight: 1.5, letterSpacing: 0 },
  caption: { size: 14, weight: 600, lineHeight: 1.35, letterSpacing: 0.01 },
} as const satisfies Record<string, TextStyle>;

export type TypeKey = keyof typeof typeScale;
