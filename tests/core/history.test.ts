import { describe, expect, it } from 'vitest';
import { countOn, withCount } from '../../src/core/history.ts';
import { history } from './builders.ts';

describe('history helpers', () => {
  const h = history('2026-09-28', '3-5');

  it('reads a day’s progress', () => {
    expect(countOn(h, '2026-09-28')).toBe(3);
    expect(countOn(h, '2026-09-29')).toBe(0);
  });

  it('sets a day without changing the original', () => {
    const next = withCount(h, '2026-09-29', 1);
    expect(next.completions.map((c) => c.dayKey)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
    ]);
    expect(countOn(h, '2026-09-29')).toBe(0);
  });

  it('replaces an existing day, and 0 removes it', () => {
    expect(countOn(withCount(h, '2026-09-28', 8), '2026-09-28')).toBe(8);
    expect(withCount(h, '2026-09-28', 0).completions).toHaveLength(1);
  });
});
