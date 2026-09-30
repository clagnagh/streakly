// Streaks: how many due days (or weeks) in a row the habit was done.
//
// The rules (PLAN.md section 5, plus the decisions made in Milestone 1):
// - Daily and specific-weekday habits count due days. Days that aren't due
//   neither continue nor break a streak, and doing the habit on one doesn't
//   add to it.
// - Today is still in progress: if it isn't done yet, the streak shows
//   yesterday's number, not zero.
// - Count habits only count days where the target was reached.
// - A freeze on a missed day bridges it: the streak carries on, but the
//   frozen day doesn't add to it.
// - "X times a week" habits count weeks where the target was met. The current
//   week is in progress, one freeze saves a whole missed week, and the first
//   (usually partial) week can't break the streak.

import { addDays, eachDay, startOfWeek } from './dates.ts';
import { historyEnd, historyStart, indexHistory, isComplete, isDueOn } from './schedule.ts';
import type { DayKey, Habit, HabitHistory, WeekStart } from './types.ts';

export type Streak = { count: number; unit: 'days' | 'weeks' };

export type StreakSummary = { current: Streak; best: Streak };

/** Streak lengths worth celebrating (Milestone 4). */
export const STREAK_MILESTONES = [7, 30, 100, 365] as const;

/**
 * Both streaks in one pass over the history.
 * `today` is passed in, never read from the clock, so tests can be any day.
 */
export function streaks(
  habit: Habit,
  history: HabitHistory,
  today: DayKey,
  weekStartsOn: WeekStart = 1,
): StreakSummary {
  const { current, best } =
    habit.schedule.kind === 'timesPerWeek'
      ? weeklyRuns(habit, habit.schedule.times, history, today, weekStartsOn)
      : dailyRuns(habit, history, today);
  const unit = habit.schedule.kind === 'timesPerWeek' ? 'weeks' : 'days';
  return { current: { count: current, unit }, best: { count: best, unit } };
}

export function currentStreak(
  habit: Habit,
  history: HabitHistory,
  today: DayKey,
  weekStartsOn: WeekStart = 1,
): Streak {
  return streaks(habit, history, today, weekStartsOn).current;
}

export function bestStreak(
  habit: Habit,
  history: HabitHistory,
  today: DayKey,
  weekStartsOn: WeekStart = 1,
): Streak {
  return streaks(habit, history, today, weekStartsOn).best;
}

/**
 * The milestone crossed when a streak goes from `before` to `after`, if any.
 * Used to decide when to celebrate.
 */
export function milestoneReached(before: number, after: number): number | null {
  const crossed = STREAK_MILESTONES.filter((m) => before < m && after >= m);
  return crossed.at(-1) ?? null;
}

type Runs = { current: number; best: number };

function dailyRuns(habit: Habit, history: HabitHistory, today: DayKey): Runs {
  const { counts, frozen } = indexHistory(history);
  const end = historyEnd(habit, today);
  let run = 0;
  let best = 0;

  for (const day of eachDay({ start: historyStart(habit, history), end })) {
    if (!isDueOn(habit, day)) continue;
    if (isComplete(habit, counts.get(day) ?? 0)) {
      run += 1;
      best = Math.max(best, run);
    } else if (day === end || frozen.has(day)) {
      // Still in progress, or protected by a freeze: carry on without adding.
      continue;
    } else {
      run = 0;
    }
  }
  return { current: run, best };
}

function weeklyRuns(
  habit: Habit,
  times: number,
  history: HabitHistory,
  today: DayKey,
  weekStartsOn: WeekStart,
): Runs {
  const { counts, frozen } = indexHistory(history);
  const start = historyStart(habit, history);
  const end = historyEnd(habit, today);
  const firstWeek = startOfWeek(start, weekStartsOn);
  const lastWeek = startOfWeek(end, weekStartsOn);
  let run = 0;
  let best = 0;

  for (let week = firstWeek; week <= lastWeek; week = addDays(week, 7)) {
    let done = 0;
    let hasFreeze = false;
    for (const day of eachDay({ start: week, end: addDays(week, 6) })) {
      if (day < start || day > end) continue;
      if (isComplete(habit, counts.get(day) ?? 0)) done += 1;
      if (frozen.has(day)) hasFreeze = true;
    }

    if (done >= times) {
      run += 1;
      best = Math.max(best, run);
    } else if (week === lastWeek || week === firstWeek || hasFreeze) {
      // In progress, the partial first week, or saved by a freeze.
      continue;
    } else {
      run = 0;
    }
  }
  return { current: run, best };
}
