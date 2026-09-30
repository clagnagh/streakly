// Stats: completion rates, per-weekday breakdown and heatmap levels.
// Like streaks, nothing here reads the clock: `today` is passed in.

import { addDays, eachDay, maxDay, minDay, startOfWeek, weekdayOf } from './dates.ts';
import { historyEnd, historyStart, indexHistory, isComplete, isDueOn } from './schedule.ts';
import type { DayKey, DayRange, Habit, HabitHistory, WeekStart, Weekday } from './types.ts';

export type Rate = {
  done: number;
  due: number;
  /** done ÷ due, from 0 to 1. Null when nothing was due (nothing to judge). */
  rate: number | null;
};

const rate = (done: number, due: number): Rate => ({
  done,
  due,
  rate: due === 0 ? null : done / due,
});

/** The part of `range` the habit's history actually covers. */
function clip(habit: Habit, history: HabitHistory, range: DayRange, today: DayKey): DayRange {
  return {
    start: maxDay(range.start, historyStart(habit, history)),
    end: minDay(range.end, historyEnd(habit, today)),
  };
}

/**
 * How much of what was due got done in a range.
 * - Daily/weekday habits: done due days ÷ due days. Today only counts once
 *   it's done, and frozen days don't count against you.
 * - "X times a week": finished weeks, each worth `times`, with extra
 *   completions capped. The current week and the partial first week only
 *   count once their target is met; frozen weeks that weren't met are skipped.
 */
export function completionRate(
  habit: Habit,
  history: HabitHistory,
  range: DayRange,
  today: DayKey,
  weekStartsOn: WeekStart = 1,
): Rate {
  const { counts, frozen } = indexHistory(history);
  const r = clip(habit, history, range, today);
  if (r.start > r.end) return rate(0, 0);
  const done = (day: DayKey) => isComplete(habit, counts.get(day) ?? 0);

  if (habit.schedule.kind !== 'timesPerWeek') {
    const end = historyEnd(habit, today);
    let d = 0;
    let due = 0;
    for (const day of eachDay(r)) {
      if (!isDueOn(habit, day)) continue;
      if (done(day)) {
        d += 1;
        due += 1;
      } else if (day !== end && !frozen.has(day)) {
        due += 1;
      }
    }
    return rate(d, due);
  }

  const times = habit.schedule.times;
  const firstWeek = startOfWeek(historyStart(habit, history), weekStartsOn);
  const lastWeek = startOfWeek(historyEnd(habit, today), weekStartsOn);
  let d = 0;
  let due = 0;
  for (let week = startOfWeek(r.start, weekStartsOn); week <= r.end; week = addDays(week, 7)) {
    const days = eachDay({ start: maxDay(week, r.start), end: minDay(addDays(week, 6), r.end) });
    const count = Math.min(times, days.filter(done).length);
    const lenient = week === lastWeek || week === firstWeek || days.some((d) => frozen.has(d));
    if (count < times && lenient) continue;
    d += count;
    due += times;
  }
  return rate(d, due);
}

export type WeekdayRate = Rate & { weekday: Weekday };

/**
 * Completion rate for each weekday (Sunday first). For "X times a week"
 * habits every day is a chance, so it shows which days you tend to do it.
 */
export function weekdayBreakdown(
  habit: Habit,
  history: HabitHistory,
  range: DayRange,
  today: DayKey,
): WeekdayRate[] {
  const { counts } = indexHistory(history);
  const end = historyEnd(habit, today);
  const tally = Array.from({ length: 7 }, () => ({ done: 0, due: 0 }));
  for (const day of eachDay(clip(habit, history, range, today))) {
    if (!isDueOn(habit, day)) continue;
    const done = isComplete(habit, counts.get(day) ?? 0);
    if (day === end && !done) continue; // today is still in progress
    const t = tally[weekdayOf(day)]!;
    t.due += 1;
    if (done) t.done += 1;
  }
  return tally.map((t, i) => ({ weekday: i as Weekday, ...rate(t.done, t.due) }));
}

/** 0 = nothing, 1–3 = partly done, 4 = fully done. Null = not due. */
export type HeatLevel = 0 | 1 | 2 | 3 | 4 | null;

export type HeatCell = { day: DayKey; level: HeatLevel };

/** Turns a 0–1 share into a heatmap level. */
export function levelFor(share: number): Exclude<HeatLevel, null> {
  if (share <= 0) return 0;
  if (share >= 1) return 4;
  if (share < 1 / 3) return 1;
  if (share < 2 / 3) return 2;
  return 3;
}

/** One habit's heatmap: partial progress on count habits shows as 1–3. */
export function habitHeatmap(
  habit: Habit,
  history: HabitHistory,
  range: DayRange,
  today: DayKey,
): HeatCell[] {
  const { counts } = indexHistory(history);
  const r = clip(habit, history, range, today);
  return eachDay(range).map((day) => {
    if (day < r.start || day > r.end || !isDueOn(habit, day)) return { day, level: null };
    const target = Math.max(1, habit.targetCount);
    return { day, level: levelFor((counts.get(day) ?? 0) / target) };
  });
}

/**
 * All habits together: for each day, the share of due habits that got done
 * (partial count progress counts partly). "X times a week" habits only add to
 * a day when they were done, so resting days don't pull the day down.
 */
export function overallHeatmap(
  habits: readonly { habit: Habit; history: HabitHistory }[],
  range: DayRange,
  today: DayKey,
): HeatCell[] {
  const prepared = habits.map(({ habit, history }) => ({
    habit,
    counts: indexHistory(history).counts,
    start: historyStart(habit, history),
    end: historyEnd(habit, today),
  }));

  return eachDay(range).map((day) => {
    let progress = 0;
    let due = 0;
    for (const p of prepared) {
      if (day < p.start || day > p.end || !isDueOn(p.habit, day)) continue;
      const share = Math.min(1, (p.counts.get(day) ?? 0) / Math.max(1, p.habit.targetCount));
      if (p.habit.schedule.kind === 'timesPerWeek' && share < 1) continue;
      progress += share;
      due += 1;
    }
    return { day, level: due === 0 ? null : levelFor(progress / due) };
  });
}

/** Every day the habit was completed, due or not. */
export function totalCompletions(habit: Habit, history: HabitHistory): number {
  let total = 0;
  for (const count of indexHistory(history).counts.values())
    if (isComplete(habit, count)) total += 1;
  return total;
}
