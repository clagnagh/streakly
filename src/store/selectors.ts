// What the screens show, worked out from the store's state with the core
// rules. Pages call these instead of calculating anything themselves.

import {
  addDays,
  countOn,
  eachDay,
  emptyHistory,
  habitsForToday,
  isComplete,
  isDueOn,
  streaks,
  weekRange,
  type DayKey,
  type HabitHistory,
  type HabitRecord,
  type Streak,
  type StreakSummary,
  type WeekStart,
} from '../core/index.ts';

export type TodayItem = {
  habit: HabitRecord;
  count: number;
  done: boolean;
  streak: Streak;
  /** For "X times a week" habits: progress this week. */
  week: { done: number; times: number } | null;
};

function weekProgress(
  habit: HabitRecord,
  history: HabitHistory,
  today: DayKey,
  weekStartsOn: WeekStart,
) {
  if (habit.schedule.kind !== 'timesPerWeek') return null;
  const { start } = weekRange(today, weekStartsOn);
  const days = eachDay({ start, end: today });
  const done = days.filter((d) => isComplete(habit, countOn(history, d))).length;
  return { done, times: habit.schedule.times };
}

export function todayItems(
  habits: readonly HabitRecord[],
  histories: Record<string, HabitHistory>,
  today: DayKey,
  weekStartsOn: WeekStart,
): TodayItem[] {
  return habitsForToday(habits, today).map((habit) => {
    const history = histories[habit.id] ?? emptyHistory;
    const count = countOn(history, today);
    return {
      habit,
      count,
      done: isComplete(habit, count),
      streak: streaks(habit, history, today, weekStartsOn).current,
      week: weekProgress(habit, history, today, weekStartsOn),
    };
  });
}

/**
 * "3 of 5 done" for the day. A weekly habit counts as done once it's done
 * today or its target for the week is already met: resting is fine.
 */
export function dayProgress(items: readonly TodayItem[]) {
  const done = items.filter((i) => i.done || (i.week !== null && i.week.done >= i.week.times));
  return { done: done.length, total: items.length };
}

export type DayCell = {
  day: DayKey;
  count: number;
  done: boolean;
  due: boolean;
  frozen: boolean;
};

export type HabitDetail = {
  habit: HabitRecord;
  history: HabitHistory;
  streaks: StreakSummary;
  /** The last `days` days, oldest first, ending today. */
  cells: DayCell[];
};

export function habitDetail(
  habit: HabitRecord,
  history: HabitHistory = emptyHistory,
  today: DayKey,
  weekStartsOn: WeekStart,
  days = 30,
): HabitDetail {
  const frozen = new Set(history.freezes);
  const cells = eachDay({ start: addDays(today, -(days - 1)), end: today }).map((day) => {
    const count = countOn(history, day);
    return {
      day,
      count,
      done: isComplete(habit, count),
      due: isDueOn({ ...habit, archivedDay: null }, day),
      frozen: frozen.has(day),
    };
  });
  return { habit, history, streaks: streaks(habit, history, today, weekStartsOn), cells };
}

export const activeHabits = (habits: readonly HabitRecord[]) =>
  habits.filter((h) => !h.archivedDay);
export const archivedHabits = (habits: readonly HabitRecord[]) =>
  habits.filter((h) => h.archivedDay);
