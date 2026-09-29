// Colour themes. This folder is the only place a hex colour may appear.
// Every theme must define the same keys; tests/theme.test.ts checks that,
// and checks text contrast.

export const habitColorKeys = [
  'tomato',
  'amber',
  'sage',
  'teal',
  'sky',
  'indigo',
  'violet',
  'rose',
] as const;

export type HabitColorKey = (typeof habitColorKeys)[number];

export type Theme = {
  name: 'light' | 'dark';
  color: {
    background: string;
    surface: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    /** Text and icons drawn on top of the accent colour. */
    onAccent: string;
    success: string;
    danger: string;
  };
  habit: Record<HabitColorKey, string>;
  shadow: {
    sm: string;
    md: string;
  };
};

export const light: Theme = {
  name: 'light',
  color: {
    background: '#FAF7F2',
    surface: '#FFFFFF',
    border: '#E8E2D9',
    textPrimary: '#2B2A28',
    textSecondary: '#6B665E',
    accent: '#1F6F6B',
    onAccent: '#FFFFFF',
    success: '#2F7D4F',
    danger: '#B3413B',
  },
  habit: {
    tomato: '#D2553E',
    amber: '#B97D0F',
    sage: '#5A8A5D',
    teal: '#2A8680',
    sky: '#3979B8',
    indigo: '#5B5FC7',
    violet: '#8B58B5',
    rose: '#C44D78',
  },
  shadow: {
    sm: '0 1px 2px rgba(43, 42, 40, 0.06), 0 1px 3px rgba(43, 42, 40, 0.08)',
    md: '0 4px 12px rgba(43, 42, 40, 0.08), 0 2px 4px rgba(43, 42, 40, 0.06)',
  },
};

export const dark: Theme = {
  name: 'dark',
  color: {
    background: '#1A1917',
    surface: '#252421',
    border: '#3A3834',
    textPrimary: '#F2EFEA',
    textSecondary: '#ABA59C',
    accent: '#5EC4BC',
    onAccent: '#0E2B29',
    success: '#6BCB8B',
    danger: '#F08A80',
  },
  habit: {
    tomato: '#F08A73',
    amber: '#F2C14E',
    sage: '#93C396',
    teal: '#5FC9C0',
    sky: '#7AB6F0',
    indigo: '#9EA1F2',
    violet: '#C39AE6',
    rose: '#EE8BAE',
  },
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
    md: '0 4px 12px rgba(0, 0, 0, 0.45), 0 2px 4px rgba(0, 0, 0, 0.3)',
  },
};

export const themes = { light, dark } as const;
