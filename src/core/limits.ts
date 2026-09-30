// Free versus Pro, in one place. Every limit the app enforces comes from here.

import { addDays, monthOf } from './dates.ts';
import type { DayKey, Plan } from './types.ts';

/** Active (non-archived) habits allowed on the free plan. */
export const FREE_ACTIVE_HABIT_LIMIT = 3;

/** Streak freezes a Pro user gets each calendar month. */
export const PRO_FREEZES_PER_MONTH = 2;

/** Days of history the free plan shows (today included). */
export const FREE_HISTORY_DAYS = 30;

export type ProFeature = 'unlimitedHabits' | 'themes' | 'freezes' | 'fullHistory' | 'export';

export function canUse(_feature: ProFeature, plan: Plan): boolean {
  return plan === 'pro';
}

export function canCreateHabit(activeHabitCount: number, plan: Plan): boolean {
  return plan === 'pro' || activeHabitCount < FREE_ACTIVE_HABIT_LIMIT;
}

type Orderable = { id: string; sortOrder: number; archivedDay?: DayKey | null };

/**
 * Habits that become read-only on the free plan (for example after Pro ends
 * while someone has more than 3). Nothing is ever deleted: the first 3 active
 * habits in the user's own order stay editable, and archiving or reordering
 * changes which ones those are.
 */
export function readOnlyHabitIds(habits: readonly Orderable[], plan: Plan): Set<string> {
  if (plan === 'pro') return new Set();
  const active = habits.filter((h) => !h.archivedDay).sort((a, b) => a.sortOrder - b.sortOrder);
  return new Set(active.slice(FREE_ACTIVE_HABIT_LIMIT).map((h) => h.id));
}

/** Stored freeze allowance: how many are left, and for which month. */
export type FreezeAllowance = { remaining: number; month: string } | null;

/** Freezes available today. The allowance refills when a new month starts. */
export function freezesAvailable(stored: FreezeAllowance, today: DayKey, plan: Plan): number {
  if (plan !== 'pro') return 0;
  if (!stored || stored.month !== monthOf(today)) return PRO_FREEZES_PER_MONTH;
  return Math.max(0, stored.remaining);
}

/** The allowance to store after using one freeze today. */
export function spendFreeze(stored: FreezeAllowance, today: DayKey, plan: Plan): FreezeAllowance {
  const available = freezesAvailable(stored, today, plan);
  if (available === 0) throw new Error('No freezes left this month');
  return { remaining: available - 1, month: monthOf(today) };
}

/** The earliest day the plan shows history for, or null for all of it. */
export function visibleHistoryStart(today: DayKey, plan: Plan): DayKey | null {
  return plan === 'pro' ? null : addDays(today, -(FREE_HISTORY_DAYS - 1));
}
