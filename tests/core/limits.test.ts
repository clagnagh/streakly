import { describe, expect, it } from 'vitest';
import {
  FREE_ACTIVE_HABIT_LIMIT,
  PRO_FREEZES_PER_MONTH,
  canCreateHabit,
  canUse,
  freezesAvailable,
  readOnlyHabitIds,
  spendFreeze,
  visibleHistoryStart,
} from '../../src/core/limits.ts';
import { TODAY } from './builders.ts';

describe('free vs Pro', () => {
  it('free allows 3 active habits; Pro is unlimited', () => {
    expect(FREE_ACTIVE_HABIT_LIMIT).toBe(3);
    expect(canCreateHabit(2, 'free')).toBe(true);
    expect(canCreateHabit(3, 'free')).toBe(false);
    expect(canCreateHabit(50, 'pro')).toBe(true);
  });

  it('Pro features need Pro', () => {
    expect(canUse('export', 'free')).toBe(false);
    expect(canUse('themes', 'pro')).toBe(true);
  });

  it('free shows the last 30 days of history; Pro shows everything', () => {
    expect(visibleHistoryStart(TODAY, 'free')).toBe('2026-09-01');
    expect(visibleHistoryStart(TODAY, 'pro')).toBeNull();
  });
});

describe('over the limit after Pro ends', () => {
  const habits = [
    { id: 'e', sortOrder: 5 },
    { id: 'a', sortOrder: 1 },
    { id: 'archived', sortOrder: 0, archivedDay: '2026-09-01' },
    { id: 'c', sortOrder: 3 },
    { id: 'd', sortOrder: 4 },
    { id: 'b', sortOrder: 2 },
  ];

  it('nothing is deleted: habits after the first 3 active ones become read-only', () => {
    expect([...readOnlyHabitIds(habits, 'free')].sort()).toEqual(['d', 'e']);
  });

  it('Pro has no read-only habits', () => {
    expect(readOnlyHabitIds(habits, 'pro').size).toBe(0);
  });
});

describe('freezes', () => {
  it('free users have none', () => {
    expect(freezesAvailable(null, TODAY, 'free')).toBe(0);
  });

  it('Pro users get a monthly allowance that refills each month', () => {
    expect(freezesAvailable(null, TODAY, 'pro')).toBe(PRO_FREEZES_PER_MONTH);
    expect(freezesAvailable({ remaining: 1, month: '2026-09' }, TODAY, 'pro')).toBe(1);
    expect(freezesAvailable({ remaining: 0, month: '2026-08' }, TODAY, 'pro')).toBe(2);
  });

  it('using one takes it off this month', () => {
    expect(spendFreeze(null, TODAY, 'pro')).toEqual({ remaining: 1, month: '2026-09' });
    expect(() => spendFreeze({ remaining: 0, month: '2026-09' }, TODAY, 'pro')).toThrow();
  });
});
