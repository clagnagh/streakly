// Turns the tokens into CSS custom properties ("variables"), so CSS Modules can
// write var(--space-lg) instead of 16px. `vars` gives the same names to code,
// e.g. style={{ gap: vars.space.lg }}.

import { durations, easings, radii, sizes, spacing } from './tokens.ts';
import { themes, type Theme } from './themes.ts';
import { fontFamily, typeScale } from './typography.ts';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

function mapVars<T extends Record<string, unknown>>(prefix: string, obj: T) {
  const out = {} as { [K in keyof T]: string };
  for (const key of Object.keys(obj) as (keyof T & string)[]) {
    out[key] = `var(--${prefix}-${kebab(key)})`;
  }
  return out;
}

/** CSS variable references, typed, for inline styles. */
export const vars = {
  color: mapVars('color', themes.light.color),
  habit: mapVars('habit', themes.light.habit),
  shadow: mapVars('shadow', themes.light.shadow),
  space: mapVars('space', spacing),
  radius: mapVars('radius', radii),
  duration: mapVars('duration', durations),
  easing: mapVars('easing', easings),
  size: mapVars('size', sizes),
};

function declarations(entries: [string, string][]): string {
  return entries.map(([name, value]) => `  --${name}: ${value};`).join('\n');
}

function themeEntries(theme: Theme): [string, string][] {
  return [
    ...Object.entries(theme.color).map(([k, v]): [string, string] => [`color-${kebab(k)}`, v]),
    ...Object.entries(theme.habit).map(([k, v]): [string, string] => [`habit-${kebab(k)}`, v]),
    ...Object.entries(theme.shadow).map(([k, v]): [string, string] => [`shadow-${kebab(k)}`, v]),
  ];
}

function staticEntries(): [string, string][] {
  const px = (n: number) => `${n}px`;
  return [
    ['font-family', fontFamily],
    ...Object.entries(spacing).map(([k, v]): [string, string] => [`space-${k}`, px(v)]),
    ...Object.entries(radii).map(([k, v]): [string, string] => [`radius-${k}`, px(v)]),
    ...Object.entries(durations).map(([k, v]): [string, string] => [`duration-${k}`, `${v}ms`]),
    ...Object.entries(easings).map(([k, v]): [string, string] => [`easing-${k}`, v]),
    ...Object.entries(sizes).map(([k, v]): [string, string] => [`size-${kebab(k)}`, px(v)]),
    ...Object.entries(typeScale).flatMap(([k, t]): [string, string][] => [
      [`font-size-${k}`, px(t.size)],
      [`font-weight-${k}`, String(t.weight)],
      [`line-height-${k}`, String(t.lineHeight)],
      [`letter-spacing-${k}`, `${t.letterSpacing}em`],
    ]),
  ];
}

function themeBlock(selector: string, theme: Theme): string {
  return `${selector} {\n  color-scheme: ${theme.name};\n${declarations(themeEntries(theme))}\n}`;
}

/**
 * The full stylesheet of variables.
 * - Light is the default.
 * - Dark follows the system setting unless the page chose light.
 * - data-theme="light" / "dark" on any element forces a theme for that part of
 *   the page (Settings will use it on <html>; /dev/tokens uses it per panel).
 */
export function buildThemeCss(): string {
  return [
    `:root {\n${declarations(staticEntries())}\n}`,
    themeBlock(':root', themes.light),
    `@media (prefers-color-scheme: dark) {\n${themeBlock(':root:not([data-theme="light"])', themes.dark)}\n}`,
    themeBlock('[data-theme="light"]', themes.light),
    themeBlock('[data-theme="dark"]', themes.dark),
  ].join('\n\n');
}

/** The CSS colour for a habit's saved colour key (falls back to the accent). */
export function habitColor(key: string): string {
  return (vars.habit as Record<string, string>)[key] ?? vars.color.accent;
}
