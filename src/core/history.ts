// Small helpers for reading and changing a habit's history in memory.
// They never change the history they're given; they return a new one, so
// the store can keep the old one to put back if saving fails.

import type { DayKey, HabitHistory } from './types.ts';

/** Progress recorded on a day (0 if nothing). */
export function countOn(history: HabitHistory, day: DayKey): number {
  return history.completions.find((c) => c.dayKey === day)?.count ?? 0;
}

/** A copy of the history with that day's progress set. 0 removes the day. */
export function withCount(history: HabitHistory, day: DayKey, count: number): HabitHistory {
  const others = history.completions.filter((c) => c.dayKey !== day);
  const completions =
    count > 0
      ? [...others, { dayKey: day, count }].sort((a, b) => (a.dayKey < b.dayKey ? -1 : 1))
      : others;
  return { ...history, completions };
}

export const emptyHistory: HabitHistory = { completions: [], freezes: [] };
