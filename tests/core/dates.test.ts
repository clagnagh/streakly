import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayKey,
  daysBetween,
  eachDay,
  isDayKey,
  monthOf,
  weekRange,
  weekdayOf,
} from '../../src/core/dates.ts';

const NEW_YORK = 'America/New_York';
const TOKYO = 'Asia/Tokyo';
const at = (iso: string) => new Date(iso);

describe('dayKey', () => {
  it('is the local calendar date', () => {
    // 14:00 UTC is 10:00 in New York (summer time, UTC-4).
    expect(dayKey(at('2026-09-30T14:00:00Z'), 4, NEW_YORK)).toBe('2026-09-30');
  });

  it('1 a.m. counts for the previous day (day starts at 4 a.m.)', () => {
    // 05:00 UTC on 1 Oct is 01:00 on 1 Oct in New York.
    expect(dayKey(at('2026-10-01T05:00:00Z'), 4, NEW_YORK)).toBe('2026-09-30');
  });

  it('3:59 a.m. is still the previous day, 4:00 a.m. starts the new one', () => {
    expect(dayKey(at('2026-10-01T07:59:00Z'), 4, NEW_YORK)).toBe('2026-09-30');
    expect(dayKey(at('2026-10-01T08:00:00Z'), 4, NEW_YORK)).toBe('2026-10-01');
  });

  it('with the day starting at midnight, 00:30 is the new day', () => {
    expect(dayKey(at('2026-10-01T04:30:00Z'), 0, NEW_YORK)).toBe('2026-10-01');
  });

  it('the same moment is a different day in different time zones', () => {
    const moment = at('2026-09-30T20:00:00Z'); // 16:00 in New York, 05:00 next day in Tokyo
    expect(dayKey(moment, 4, NEW_YORK)).toBe('2026-09-30');
    expect(dayKey(moment, 4, TOKYO)).toBe('2026-10-01');
  });

  it('uses wall-clock time on the night clocks go forward', () => {
    // New York jumps from 02:00 to 03:00 on 8 Mar 2026.
    expect(dayKey(at('2026-03-08T07:30:00Z'), 4, NEW_YORK)).toBe('2026-03-07'); // 03:30
    expect(dayKey(at('2026-03-08T08:00:00Z'), 4, NEW_YORK)).toBe('2026-03-08'); // 04:00
  });

  it('uses wall-clock time on the night clocks go back', () => {
    // New York repeats 01:00–02:00 on 1 Nov 2026; both 1 a.m.s are the day before.
    expect(dayKey(at('2026-11-01T05:30:00Z'), 4, NEW_YORK)).toBe('2026-10-31'); // first 01:30
    expect(dayKey(at('2026-11-01T06:30:00Z'), 4, NEW_YORK)).toBe('2026-10-31'); // second 01:30
    expect(dayKey(at('2026-11-01T09:00:00Z'), 4, NEW_YORK)).toBe('2026-11-01'); // 04:00
  });
});

describe('day maths', () => {
  it('adds days across months, years and leap days', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('never skips or repeats a day over daylight-saving weekends', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30);
  });

  it('counts days between two keys', () => {
    expect(daysBetween('2026-09-01', '2026-09-30')).toBe(29);
    expect(daysBetween('2026-09-30', '2026-09-01')).toBe(-29);
    expect(daysBetween('2026-09-30', '2026-09-30')).toBe(0);
  });

  it('knows the weekday', () => {
    expect(weekdayOf('2026-09-27')).toBe(0); // Sunday
    expect(weekdayOf('2026-09-28')).toBe(1); // Monday
    expect(weekdayOf('2026-10-03')).toBe(6); // Saturday
  });

  it('finds the week, starting Monday or Sunday', () => {
    expect(weekRange('2026-09-30', 1)).toEqual({ start: '2026-09-28', end: '2026-10-04' });
    expect(weekRange('2026-09-30', 0)).toEqual({ start: '2026-09-27', end: '2026-10-03' });
    // A Sunday is the last day of a Monday-start week, the first of a Sunday-start one.
    expect(weekRange('2026-10-04', 1).start).toBe('2026-09-28');
    expect(weekRange('2026-10-04', 0).start).toBe('2026-10-04');
  });

  it('lists every day in a range', () => {
    expect(eachDay({ start: '2026-09-29', end: '2026-10-01' })).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
    ]);
    expect(eachDay({ start: '2026-10-01', end: '2026-09-29' })).toEqual([]);
  });

  it('gives the month', () => {
    expect(monthOf('2026-09-30')).toBe('2026-09');
  });

  it('rejects things that are not real days', () => {
    expect(isDayKey('2026-09-30')).toBe(true);
    expect(isDayKey('2026-02-30')).toBe(false);
    expect(isDayKey('30/09/2026')).toBe(false);
    expect(() => addDays('2026-13-01', 1)).toThrow();
  });
});
