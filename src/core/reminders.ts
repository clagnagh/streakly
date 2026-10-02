// Which reminders have "come due" right now.
//
// A reminder time is local wall-clock time, "08:30". Because the day runs
// from the day-start hour (4 a.m.) to the next, times are compared as
// minutes since the day started: at 01:00 (still "yesterday"), a 21:00
// reminder has passed, but an 08:30 one hasn't.

import { countOn, emptyHistory } from './history.ts';
import { habitsForToday, isComplete } from './schedule.ts';
import { eachDay, weekRange } from './dates.ts';
import type { DayKey, Habit, HabitHistory, WeekStart } from './types.ts';

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isTime(value: string): boolean {
  return TIME.test(value);
}

/** Minutes from the start of the habit day to `time` ("HH:MM"). */
export function minutesIntoDay(time: string, dayStartHour: number): number {
  const m = TIME.exec(time);
  if (!m) throw new Error(`Not a time: "${time}"`);
  const hours = (Number(m[1]) - dayStartHour + 24) % 24;
  return hours * 60 + Number(m[2]);
}

export type ReminderHabit = Habit & { reminderTime: string | null };

/**
 * Habits whose reminder time has passed today and that still need doing:
 * due today, not archived, not complete, and (for "X times a week" habits)
 * this week's target not already met.
 */
export function overdueReminders<H extends ReminderHabit>(
  habits: readonly H[],
  histories: Record<string, HabitHistory>,
  today: DayKey,
  nowTime: string,
  dayStartHour: number,
  weekStartsOn: WeekStart,
): H[] {
  const now = minutesIntoDay(nowTime, dayStartHour);
  return habitsForToday(habits, today).filter((habit) => {
    if (!habit.reminderTime || !isTime(habit.reminderTime)) return false;
    if (minutesIntoDay(habit.reminderTime, dayStartHour) > now) return false;
    const history = histories[habit.id] ?? emptyHistory;
    if (isComplete(habit, countOn(history, today))) return false;
    if (habit.schedule.kind === 'timesPerWeek') {
      const { start } = weekRange(today, weekStartsOn);
      const done = eachDay({ start, end: today }).filter((d) =>
        isComplete(habit, countOn(history, d)),
      ).length;
      if (done >= habit.schedule.times) return false;
    }
    return true;
  });
}
