// Helpers that make tests read like a calendar.

import { addDays } from '../../src/core/dates.ts';
import type { Completion, DayKey, Habit, HabitHistory } from '../../src/core/types.ts';

/** A daily check habit created on 1 Sep 2026, with any fields overridden. */
export function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    type: 'check',
    targetCount: 1,
    schedule: { kind: 'daily' },
    createdDay: '2026-09-01',
    archivedDay: null,
    ...over,
  };
}

/**
 * A history written as one character per day, starting at `start`:
 *   x    done (count = target)
 *   1–9  that much progress (for count habits)
 *   -    nothing recorded
 *   .    nothing recorded (use it to mark days that aren't due, for readability)
 *   f    nothing recorded, but a streak freeze was used
 * Spaces are ignored, so weeks can be grouped: 'xxx.... xx.....'
 */
export function history(start: DayKey, pattern: string, target = 1): HabitHistory {
  const completions: Completion[] = [];
  const freezes: DayKey[] = [];
  let day = start;
  for (const ch of pattern) {
    if (ch === ' ') continue;
    if (ch === 'x') completions.push({ dayKey: day, count: target });
    else if (/[1-9]/.test(ch)) completions.push({ dayKey: day, count: Number(ch) });
    else if (ch === 'f') freezes.push(day);
    else if (ch !== '-' && ch !== '.') throw new Error(`Unknown history character "${ch}"`);
    day = addDays(day, 1);
  }
  return { completions, freezes };
}

/** Adds one completion to a history (for backfill tests). */
export function withCompletion(h: HabitHistory, dayKey: DayKey, count = 1): HabitHistory {
  return { ...h, completions: [...h.completions, { dayKey, count }] };
}

/** Wednesday 30 September 2026: "today" in most tests. */
export const TODAY = '2026-09-30';
