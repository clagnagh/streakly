// Sample data for development: 5 habits with 90 days of realistic history.
// It REPLACES everything in the database, so it's only offered on #/dev/db.
//
// The "random" history comes from a seeded generator, so it's the same every
// time: tests can check exact numbers, and screenshots don't change.

import { addDays, isDueOn, type DayKey } from '../core/index.ts';
import type { Db, Statement } from './adapter.ts';
import type { HabitInput } from './habitsRepo.ts';

export const SEED_DAYS = 90;

/** A tiny repeatable random number generator (mulberry32). */
function seededRandom(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type SeedHabit = HabitInput & {
  id: string;
  /** How many days ago it was created. */
  age: number;
  /** Progress for a day `daysAgo` before today (0 = nothing). */
  progress: (daysAgo: number, rand: () => number) => number;
};

export const seedHabits: SeedHabit[] = [
  {
    id: 'seed-meditate',
    name: 'Meditate',
    emoji: '🧘',
    colorKey: 'teal',
    type: 'check',
    targetCount: 1,
    unit: null,
    schedule: { kind: 'daily' },
    reminderTime: '07:30',
    age: SEED_DAYS - 1,
    // A 12-day streak running into today (not done yet), after a miss 13 days ago.
    progress: (ago, rand) => (ago === 0 || ago === 13 ? 0 : ago <= 12 || rand() < 0.85 ? 1 : 0),
  },
  {
    id: 'seed-water',
    name: 'Drink water',
    emoji: '💧',
    colorKey: 'sky',
    type: 'count',
    targetCount: 8,
    unit: 'glasses',
    schedule: { kind: 'daily' },
    reminderTime: null,
    age: SEED_DAYS - 1,
    // Usually all 8; sometimes fewer. 3 so far today.
    progress: (ago, rand) => (ago === 0 ? 3 : rand() < 0.6 ? 8 : 3 + Math.floor(rand() * 5)),
  },
  {
    id: 'seed-read',
    name: 'Read',
    emoji: '📚',
    colorKey: 'indigo',
    type: 'check',
    targetCount: 1,
    unit: null,
    schedule: { kind: 'weekdays', days: [1, 2, 3, 4, 5] },
    reminderTime: '21:00',
    age: SEED_DAYS - 1,
    progress: (_ago, rand) => (rand() < 0.8 ? 1 : 0),
  },
  {
    id: 'seed-run',
    name: 'Run',
    emoji: '🏃',
    colorKey: 'tomato',
    type: 'check',
    targetCount: 1,
    unit: null,
    schedule: { kind: 'timesPerWeek', times: 3 },
    reminderTime: null,
    age: SEED_DAYS - 1,
    progress: (_ago, rand) => (rand() < 0.45 ? 1 : 0),
  },
  {
    id: 'seed-stretch',
    name: 'Stretch',
    emoji: '🤸',
    colorKey: 'sage',
    type: 'check',
    targetCount: 1,
    unit: null,
    schedule: { kind: 'weekdays', days: [1, 3, 5] },
    reminderTime: null,
    age: 29,
    progress: (_ago, rand) => (rand() < 0.7 ? 1 : 0),
  },
];

/** The day, 40 days before today, when Meditate was missed but saved by a freeze. */
export const SEED_FREEZE_DAYS_AGO = 40;

/** Replaces all data with the sample habits. `today` and `now` come from the caller. */
export async function seedDevData(db: Db, today: DayKey, now: string): Promise<void> {
  const rand = seededRandom(20260930);
  const statements: Statement[] = [
    { sql: 'DELETE FROM habits' }, // completions and freezes go too (cascade)
    { sql: 'DELETE FROM settings' },
  ];

  seedHabits.forEach((h, sortOrder) => {
    const createdDay = addDays(today, -h.age);
    statements.push({
      sql: `INSERT INTO habits (id, name, emoji, color_key, type, target_count, unit,
              schedule_kind, schedule_days, times_per_week, reminder_time, sort_order,
              created_day, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        h.id,
        h.name,
        h.emoji,
        h.colorKey,
        h.type,
        h.targetCount,
        h.unit,
        h.schedule.kind === 'timesPerWeek' ? 'times_per_week' : h.schedule.kind,
        h.schedule.kind === 'weekdays' ? h.schedule.days.join(',') : null,
        h.schedule.kind === 'timesPerWeek' ? h.schedule.times : null,
        h.reminderTime,
        sortOrder,
        createdDay,
        now,
      ],
    });

    for (let ago = h.age; ago >= 0; ago--) {
      const day = addDays(today, -ago);
      const count = h.progress(ago, rand);
      if (count <= 0 || !isDueOn({ ...h, createdDay }, day)) continue;
      statements.push({
        sql: 'INSERT INTO completions (id, habit_id, day_key, count, created_at) VALUES (?, ?, ?, ?, ?)',
        params: [`${h.id}-${day}`, h.id, day, count, now],
      });
    }
  });

  // One missed Meditate day protected by a freeze.
  const frozenDay = addDays(today, -SEED_FREEZE_DAYS_AGO);
  statements.push(
    {
      sql: 'DELETE FROM completions WHERE habit_id = ? AND day_key = ?',
      params: ['seed-meditate', frozenDay],
    },
    {
      sql: 'INSERT INTO freezes (habit_id, day_key) VALUES (?, ?)',
      params: ['seed-meditate', frozenDay],
    },
  );

  await db.batch(statements);
}
