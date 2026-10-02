import { describe, expect, it } from 'vitest';
import {
  formatDay,
  scheduleLabel,
  streakLabel,
  streakLength,
  weekdaysInOrder,
} from '../src/format.ts';

describe('screen text', () => {
  it('describes schedules', () => {
    expect(scheduleLabel({ kind: 'daily' })).toBe('Every day');
    expect(scheduleLabel({ kind: 'weekdays', days: [1, 2, 3, 4, 5] })).toBe('Weekdays');
    expect(scheduleLabel({ kind: 'weekdays', days: [0, 6] })).toBe('Weekends');
    expect(scheduleLabel({ kind: 'weekdays', days: [5, 1, 3] })).toBe('Mon, Wed, Fri');
    expect(scheduleLabel({ kind: 'weekdays', days: [0, 1] }, 0)).toBe('Sun, Mon');
    expect(scheduleLabel({ kind: 'timesPerWeek', times: 3 })).toBe('3 times a week');
    expect(scheduleLabel({ kind: 'timesPerWeek', times: 1 })).toBe('Once a week');
  });

  it('describes streaks kindly (no streak is just blank)', () => {
    expect(streakLabel({ count: 0, unit: 'days' })).toBe('');
    expect(streakLabel({ count: 12, unit: 'days' })).toBe('12-day streak');
    expect(streakLabel({ count: 1, unit: 'weeks' })).toBe('1-week streak');
    expect(streakLength({ count: 1, unit: 'days' })).toBe('1 day');
    expect(streakLength({ count: 4, unit: 'weeks' })).toBe('4 weeks');
  });

  it('orders weekdays by the week start', () => {
    expect(weekdaysInOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(weekdaysInOrder(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('formats a day key as that calendar day', () => {
    expect(formatDay('2026-09-30', { day: 'numeric', month: 'numeric', year: 'numeric' })).toMatch(
      /30/,
    );
  });
});

describe('habit names on screen', () => {
  it('capitalise the first letter without changing the rest', async () => {
    const { displayName } = await import('../src/format.ts');
    expect(displayName('meditate')).toBe('Meditate');
    expect(displayName('work out')).toBe('Work out');
    expect(displayName('iPhone-free hour')).toBe('iPhone-free hour');
    expect(displayName('')).toBe('');
  });
});
