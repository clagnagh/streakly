import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildThemeCss, contrastRatio, habitColorKeys, themes, vars } from '../src/theme/index.ts';

const allThemes = Object.values(themes);

describe('themes', () => {
  it('every theme defines the same keys', () => {
    const shape = (t: object): unknown =>
      Object.fromEntries(
        Object.entries(t).map(([k, v]) => [k, typeof v === 'object' ? shape(v) : typeof v]),
      );
    const [first, ...rest] = allThemes.map((t) => shape({ ...t, name: '' }));
    for (const s of rest) expect(s).toEqual(first);
  });

  it('every habit colour key has a colour', () => {
    for (const t of allThemes)
      expect(Object.keys(t.habit).sort()).toEqual([...habitColorKeys].sort());
  });

  describe.each(allThemes)('$name theme contrast', (t) => {
    const c = t.color;
    // 4.5:1 is the WCAG AA minimum for normal text.
    it.each([
      ['textPrimary on background', c.textPrimary, c.background, 4.5],
      ['textPrimary on surface', c.textPrimary, c.surface, 4.5],
      ['textSecondary on background', c.textSecondary, c.background, 4.5],
      ['textSecondary on surface', c.textSecondary, c.surface, 4.5],
      ['accent on background (links)', c.accent, c.background, 4.5],
      ['onAccent on accent (buttons)', c.onAccent, c.accent, 4.5],
      ['danger on surface', c.danger, c.surface, 4.5],
      ['success on surface', c.success, c.surface, 3],
    ])('%s ≥ %d… ', (_label, fg, bg, min) => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
    });

    // 3:1 is the minimum for icons and shapes (a habit's coloured control).
    it.each(habitColorKeys)('habit %s stands out on surface (≥ 3)', (key) => {
      expect(contrastRatio(t.habit[key], c.surface)).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('CSS variables', () => {
  const css = buildThemeCss();

  it('defines every variable that `vars` refers to', () => {
    const names = Object.values(vars).flatMap((group) =>
      Object.values(group).map((ref) => ref.slice(4, -1)),
    );
    for (const name of names) expect(css).toContain(`${name}:`);
  });

  it('switches to dark with the system setting unless light is forced', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(':root:not([data-theme="light"])');
  });
});

// Rule 6 of the Working Agreement, enforced: no raw colours or pixel sizes in
// CSS outside src/theme. (ESLint checks .ts/.tsx files for hex colours.)
describe('design-token rule for CSS files', () => {
  const cssFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return path.endsWith('theme') ? [] : cssFiles(path);
      return path.endsWith('.css') ? [path] : [];
    });

  it.each(cssFiles('src'))('%s uses only tokens', (file) => {
    const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(text, 'hex colour').not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(text, 'rgb()/hsl() colour').not.toMatch(/\b(rgba?|hsla?)\(/);
    // 0 and 1px (hairlines) are fine; anything bigger must be a token.
    expect(text, 'pixel value').not.toMatch(/(?<![\w.-])([2-9]|\d{2,})(\.\d+)?px\b/);
  });
});
