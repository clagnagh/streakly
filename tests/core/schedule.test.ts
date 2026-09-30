import { describe, expect, it } from 'vitest';
import {
  canEditDay,
  dueDaysIn,
  habitsForToday,
  historyStart,
  isComplete,
  isDueOn,
} from '../../src/core/schedule.ts';
import { TODAY, habit, history } from './builders.ts';

const monWedFri = habit({ schedule: { kind: 'weekdays', days: [1, 3, 5] } });

describe('what is due', () => {
  it('daily habits are due every day', () => {
    expect(isDueOn(habit(), '2026-09-27')).toBe(true);
  });

  it('weekday habits are due only on their days', () => {
    expect(isDueOn(monWedFri, '2026-09-28')).toBe(true); // Monday
    expect(isDueOn(monWedFri, '2026-09-29')).toBe(false); // Tuesday
    expect(dueDaysIn(monWedFri, { start: '2026-09-28', end: '2026-10-04' })).toEqual([
      '2026-09-28',
      '2026-09-30',
      '2026-10-02',
    ]);
  });

  it('"3 times a week" habits can be done any day', () => {
    const h = habit({ schedule: { kind: 'timesPerWeek', times: 3 } });
    expect(isDueOn(h, '2026-09-27')).toBe(true);
  });

  it('archived habits are not due from the day they were archived', () => {
    const h = habit({ archivedDay: '2026-09-29' });
    expect(isDueOn(h, '2026-09-28')).toBe(true);
    expect(isDueOn(h, '2026-09-29')).toBe(false);
  });

  it('Today lists due habits and hides archived ones', () => {
    const daily = habit({ id: 'daily' });
    const archived = habit({ id: 'archived', archivedDay: '2026-09-10' });
    const tuesdays = habit({ id: 'tuesdays', schedule: { kind: 'weekdays', days: [2] } });
    const wednesdays = habit({ id: 'wednesdays', schedule: { kind: 'weekdays', days: [3] } });
    const ids = habitsForToday([daily, archived, tuesdays, wednesdays], TODAY).map((h) => h.id);
    expect(ids).toEqual(['daily', 'wednesdays']);
  });
});

describe('what counts as done', () => {
  it('a check habit is done when tapped once', () => {
    expect(isComplete(habit(), 0)).toBe(false);
    expect(isComplete(habit(), 1)).toBe(true);
  });

  it('a count habit is done when it reaches its target', () => {
    const water = habit({ type: 'count', targetCount: 8 });
    expect(isComplete(water, 7)).toBe(false);
    expect(isComplete(water, 8)).toBe(true);
    expect(isComplete(water, 9)).toBe(true);
  });
});

describe('editing days', () => {
  it('past days and today can be edited; future days cannot', () => {
    expect(canEditDay('2025-01-01', TODAY)).toBe(true);
    expect(canEditDay(TODAY, TODAY)).toBe(true);
    expect(canEditDay('2026-10-01', TODAY)).toBe(false);
  });

  it('history starts at creation, or earlier if days were backfilled', () => {
    const h = habit({ createdDay: '2026-09-29' });
    expect(historyStart(h, history('2026-09-29', 'x'))).toBe('2026-09-29');
    expect(historyStart(h, history('2026-09-25', 'x'))).toBe('2026-09-25');
  });
});
