// Completions (progress per habit per day) and freezes.

import type { Completion, DayKey, DayRange, HabitHistory } from '../core/index.ts';
import type { Db } from './adapter.ts';

export type DayProgress = { habitId: string; count: number };

export function completionsRepo(db: Db) {
  return {
    /**
     * Sets a day's progress. 0 removes the record, so "not done" is simply
     * "no row". There's at most one row per habit per day (UNIQUE constraint).
     */
    async setCount(habitId: string, day: DayKey, count: number, now: string): Promise<void> {
      if (count <= 0) {
        await db.run('DELETE FROM completions WHERE habit_id = ? AND day_key = ?', [habitId, day]);
        return;
      }
      await db.run(
        `INSERT INTO completions (id, habit_id, day_key, count, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (habit_id, day_key) DO UPDATE SET count = excluded.count`,
        [crypto.randomUUID(), habitId, day, Math.round(count), now],
      );
    },

    /** Adds `by` (default 1) to a day's progress, never going below 0. Resolves to the new count. */
    async increment(habitId: string, day: DayKey, now: string, by = 1): Promise<number> {
      const current = await this.countOn(habitId, day);
      const next = Math.max(0, current + by);
      await this.setCount(habitId, day, next, now);
      return next;
    },

    async countOn(habitId: string, day: DayKey): Promise<number> {
      const row = await db.get<{ count: number }>(
        'SELECT count FROM completions WHERE habit_id = ? AND day_key = ?',
        [habitId, day],
      );
      return row?.count ?? 0;
    },

    /** Everything recorded for one habit, ready for the streak and stats rules. */
    async history(habitId: string): Promise<HabitHistory> {
      const [completions, freezes] = await Promise.all([
        db.all<Completion>(
          'SELECT day_key AS dayKey, count FROM completions WHERE habit_id = ? ORDER BY day_key',
          [habitId],
        ),
        db.all<{ dayKey: DayKey }>(
          'SELECT day_key AS dayKey FROM freezes WHERE habit_id = ? ORDER BY day_key',
          [habitId],
        ),
      ]);
      return { completions, freezes: freezes.map((f) => f.dayKey) };
    },

    /** Progress for every habit on one day (for Today). */
    async onDay(day: DayKey): Promise<DayProgress[]> {
      return db.all<DayProgress>(
        'SELECT habit_id AS habitId, count FROM completions WHERE day_key = ?',
        [day],
      );
    },

    /** Progress for every habit in a range (for stats and heatmaps). */
    async between(range: DayRange): Promise<(DayProgress & { dayKey: DayKey })[]> {
      return db.all(
        `SELECT habit_id AS habitId, day_key AS dayKey, count FROM completions
         WHERE day_key BETWEEN ? AND ? ORDER BY day_key`,
        [range.start, range.end],
      );
    },

    async addFreeze(habitId: string, day: DayKey): Promise<void> {
      await db.run('INSERT OR IGNORE INTO freezes (habit_id, day_key) VALUES (?, ?)', [
        habitId,
        day,
      ]);
    },

    async removeFreeze(habitId: string, day: DayKey): Promise<void> {
      await db.run('DELETE FROM freezes WHERE habit_id = ? AND day_key = ?', [habitId, day]);
    },
  };
}

export type CompletionsRepo = ReturnType<typeof completionsRepo>;
