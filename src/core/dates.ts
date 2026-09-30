// Day keys and calendar maths.
//
// A day key is the local calendar date, "2026-09-30". Keys are compared as
// plain strings (that works because the format is fixed-width) and all maths
// is done in UTC, where every day is exactly 24 hours, so daylight-saving
// changes can never skip or repeat a day.

import type { DayKey, DayRange, WeekStart, Weekday } from './types.ts';

const MS_PER_DAY = 86_400_000;
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Building an Intl formatter is slow, so keep one per time zone.
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/**
 * Which day an instant belongs to, for someone in `timeZone`.
 * The day ends at `dayStartHour` (4 = 4 a.m.), so 1 a.m. still counts as the
 * day before. Pass the device's current time zone; past records are never
 * recalculated, so travelling can't move or duplicate them.
 */
export function dayKey(instant: Date, dayStartHour: number, timeZone: string): DayKey {
  const parts: Record<string, string> = {};
  for (const p of formatterFor(timeZone).formatToParts(instant)) parts[p.type] = p.value;
  const key = `${parts.year}-${parts.month}-${parts.day}`;
  return Number(parts.hour) < dayStartHour ? addDays(key, -1) : key;
}

function toUtcMs(day: DayKey): number {
  const m = DAY_KEY.exec(day);
  if (!m) throw new Error(`Not a day key: "${day}"`);
  const [, y, mo, d] = m;
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d));
  if (fromUtcMs(ms) !== day) throw new Error(`Not a real date: "${day}"`);
  return ms;
}

function fromUtcMs(ms: number): DayKey {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isDayKey(value: string): boolean {
  try {
    toUtcMs(value);
    return true;
  } catch {
    return false;
  }
}

export function addDays(day: DayKey, days: number): DayKey {
  return fromUtcMs(toUtcMs(day) + days * MS_PER_DAY);
}

/** Days from `from` to `to`: positive when `to` is later. */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

export function weekdayOf(day: DayKey): Weekday {
  return new Date(toUtcMs(day)).getUTCDay() as Weekday;
}

/** The first day of the week that contains `day`. */
export function startOfWeek(day: DayKey, weekStartsOn: WeekStart): DayKey {
  return addDays(day, -((weekdayOf(day) - weekStartsOn + 7) % 7));
}

/** The 7-day week that contains `day`. */
export function weekRange(day: DayKey, weekStartsOn: WeekStart): DayRange {
  const start = startOfWeek(day, weekStartsOn);
  return { start, end: addDays(start, 6) };
}

/** "YYYY-MM", for monthly allowances like freezes. */
export function monthOf(day: DayKey): string {
  toUtcMs(day);
  return day.slice(0, 7);
}

export function minDay(a: DayKey, b: DayKey): DayKey {
  return a < b ? a : b;
}

export function maxDay(a: DayKey, b: DayKey): DayKey {
  return a > b ? a : b;
}

/** Every day in the range, in order. Empty if the range is backwards. */
export function eachDay(range: DayRange): DayKey[] {
  const days: DayKey[] = [];
  for (let d = range.start; d <= range.end; d = addDays(d, 1)) days.push(d);
  return days;
}
