// Shared shapes for the habit rules. Plain data only: no classes, no methods,
// so the same objects can come from the database, a backup file or a test.

/** A calendar day as the user experiences it: "YYYY-MM-DD". */
export type DayKey = string;

/** 0 = Sunday … 6 = Saturday (the same numbering as JavaScript's getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Which day a week starts on: Sunday or Monday. */
export type WeekStart = 0 | 1;

/** An inclusive range of days. */
export type DayRange = { start: DayKey; end: DayKey };

export type Schedule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: readonly Weekday[] }
  | { kind: 'timesPerWeek'; times: number };

export type Habit = {
  id: string;
  type: 'check' | 'count';
  /** How many a count habit needs each day (always 1 for check habits). */
  targetCount: number;
  schedule: Schedule;
  /** The local day the habit was created. */
  createdDay: DayKey;
  /** The local day it was archived, if it has been. */
  archivedDay?: DayKey | null;
};

/** Progress on one day. At most one per habit per day. */
export type Completion = { dayKey: DayKey; count: number };

/** Everything recorded for one habit. */
export type HabitHistory = {
  completions: readonly Completion[];
  /** Days protected by a streak freeze (Pro). */
  freezes: readonly DayKey[];
};

export type Plan = 'free' | 'pro';
