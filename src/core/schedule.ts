// What's due, and what counts as done.

import { addDays, eachDay, minDay, weekdayOf } from './dates.ts';
import type { DayKey, DayRange, Habit, HabitHistory } from './types.ts';

/**
 * Is the habit on the schedule for this day? "3 times a week" habits can be
 * done on any day, so they're offered every day. Archived habits are never due
 * from the day they were archived.
 */
export function isDueOn(habit: Habit, day: DayKey): boolean {
  if (habit.archivedDay && day >= habit.archivedDay) return false;
  const s = habit.schedule;
  switch (s.kind) {
    case 'daily':
    case 'timesPerWeek':
      return true;
    case 'weekdays':
      return s.days.includes(weekdayOf(day));
  }
}

/** The days in the range when the habit is due. */
export function dueDaysIn(habit: Habit, range: DayRange): DayKey[] {
  return eachDay(range).filter((day) => isDueOn(habit, day));
}

/** Habits to show on Today: not archived, and due today. */
export function habitsForToday<H extends Habit>(habits: readonly H[], today: DayKey): H[] {
  return habits.filter((h) => !h.archivedDay && isDueOn(h, today));
}

/** Does this much progress complete the day? Count habits need their target. */
export function isComplete(habit: Habit, count: number): boolean {
  return count >= Math.max(1, habit.targetCount);
}

/** Any past day can be edited (backfill); future days can't. */
export function canEditDay(day: DayKey, today: DayKey): boolean {
  return day <= today;
}

/**
 * The first day the habit's history covers: the day it was created, or the
 * earliest backfilled progress if that's earlier. Days before it are never
 * counted as missed.
 */
export function historyStart(habit: Habit, history: HabitHistory): DayKey {
  let start = habit.createdDay;
  for (const c of history.completions) if (c.count > 0 && c.dayKey < start) start = c.dayKey;
  return start;
}

/**
 * The last day that can count: today, or the day before the habit was
 * archived.
 */
export function historyEnd(habit: Habit, today: DayKey): DayKey {
  return habit.archivedDay ? minDay(today, addDays(habit.archivedDay, -1)) : today;
}

/** Quick lookups over a history: progress per day and frozen days. */
export function indexHistory(history: HabitHistory) {
  const counts = new Map<DayKey, number>();
  for (const c of history.completions) counts.set(c.dayKey, (counts.get(c.dayKey) ?? 0) + c.count);
  return { counts, frozen: new Set(history.freezes) };
}
