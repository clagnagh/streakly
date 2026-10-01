// Habits table. The only place that knows how habits are stored.

import type { DayKey, HabitRecord, Schedule, Weekday } from '../core/index.ts';
import type { Db, SqlValue } from './adapter.ts';

type HabitRow = {
  id: string;
  name: string;
  emoji: string | null;
  color_key: string;
  type: 'check' | 'count';
  target_count: number;
  unit: string | null;
  schedule_kind: 'daily' | 'weekdays' | 'times_per_week';
  schedule_days: string | null;
  times_per_week: number | null;
  reminder_time: string | null;
  sort_order: number;
  created_day: string;
  archived_day: string | null;
  created_at: string;
};

/** The fields someone fills in when creating or editing a habit. */
export type HabitInput = Pick<
  HabitRecord,
  'name' | 'emoji' | 'colorKey' | 'type' | 'targetCount' | 'unit' | 'schedule' | 'reminderTime'
>;

function scheduleFromRow(row: HabitRow): Schedule {
  switch (row.schedule_kind) {
    case 'daily':
      return { kind: 'daily' };
    case 'weekdays':
      return {
        kind: 'weekdays',
        days: (row.schedule_days ?? '')
          .split(',')
          .filter(Boolean)
          .map((d) => Number(d) as Weekday),
      };
    case 'times_per_week':
      return { kind: 'timesPerWeek', times: row.times_per_week ?? 1 };
  }
}

function scheduleColumns(s: Schedule) {
  return {
    schedule_kind: s.kind === 'timesPerWeek' ? 'times_per_week' : s.kind,
    schedule_days: s.kind === 'weekdays' ? [...s.days].sort().join(',') : null,
    times_per_week: s.kind === 'timesPerWeek' ? s.times : null,
  };
}

function fromRow(row: HabitRow): HabitRecord {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    colorKey: row.color_key,
    type: row.type,
    targetCount: row.target_count,
    unit: row.unit,
    schedule: scheduleFromRow(row),
    reminderTime: row.reminder_time,
    sortOrder: row.sort_order,
    createdDay: row.created_day,
    archivedDay: row.archived_day,
    createdAt: row.created_at,
  };
}

/** Column values for the editable fields. Check habits always have a target of 1. */
function inputColumns(input: HabitInput): Record<string, SqlValue> {
  return {
    name: input.name.trim(),
    emoji: input.emoji,
    color_key: input.colorKey,
    type: input.type,
    target_count: input.type === 'check' ? 1 : Math.max(1, Math.round(input.targetCount)),
    unit: input.type === 'count' ? input.unit : null,
    reminder_time: input.reminderTime,
    ...scheduleColumns(input.schedule),
  };
}

export function habitsRepo(db: Db) {
  return {
    /** Habits in the user's order. Archived ones are left out unless asked for. */
    async list({ includeArchived = false } = {}): Promise<HabitRecord[]> {
      const rows = await db.all<HabitRow>(
        `SELECT * FROM habits
         ${includeArchived ? '' : 'WHERE archived_day IS NULL'}
         ORDER BY sort_order, created_at`,
      );
      return rows.map(fromRow);
    },

    async get(id: string): Promise<HabitRecord | undefined> {
      const row = await db.get<HabitRow>('SELECT * FROM habits WHERE id = ?', [id]);
      return row && fromRow(row);
    },

    async countActive(): Promise<number> {
      const row = await db.get<{ n: number }>(
        'SELECT COUNT(*) AS n FROM habits WHERE archived_day IS NULL',
      );
      return row?.n ?? 0;
    },

    /**
     * Adds a habit at the end of the list. `today` and `now` are passed in so
     * the caller decides the clock (and tests can fix it).
     */
    async create(
      input: HabitInput,
      today: DayKey,
      now: string,
      id: string = crypto.randomUUID(),
    ): Promise<HabitRecord> {
      const cols = { ...inputColumns(input), id, created_day: today, created_at: now };
      const names = Object.keys(cols);
      await db.run(
        `INSERT INTO habits (${names.join(', ')}, sort_order)
         VALUES (${names.map(() => '?').join(', ')},
                 (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM habits))`,
        Object.values(cols),
      );
      return (await this.get(id))!;
    },

    async update(id: string, input: HabitInput): Promise<void> {
      const cols = inputColumns(input);
      await db.run(
        `UPDATE habits SET ${Object.keys(cols)
          .map((c) => `${c} = ?`)
          .join(', ')} WHERE id = ?`,
        [...Object.values(cols), id],
      );
    },

    /** Hides the habit from Today but keeps all its history. */
    async archive(id: string, today: DayKey): Promise<void> {
      await db.run('UPDATE habits SET archived_day = ? WHERE id = ?', [today, id]);
    },

    async unarchive(id: string): Promise<void> {
      await db.run('UPDATE habits SET archived_day = NULL WHERE id = ?', [id]);
    },

    /** Deletes the habit and, through ON DELETE CASCADE, all its history. */
    async remove(id: string): Promise<void> {
      await db.run('DELETE FROM habits WHERE id = ?', [id]);
    },

    /** Saves a new order: `ids` from first to last. */
    async reorder(ids: readonly string[]): Promise<void> {
      await db.batch(
        ids.map((id, i) => ({
          sql: 'UPDATE habits SET sort_order = ? WHERE id = ?',
          params: [i, id],
        })),
      );
    },
  };
}

export type HabitsRepo = ReturnType<typeof habitsRepo>;
