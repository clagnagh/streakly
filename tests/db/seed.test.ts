import { describe, expect, it } from 'vitest';
import { addDays, completionRate, streaks } from '../../src/core/index.ts';
import { SEED_DAYS, SEED_FREEZE_DAYS_AGO, seedDevData } from '../../src/db/seed.ts';
import { NOW, TODAY, freshDb, input } from './helpers.ts';

describe('dev seed', () => {
  it('creates 5 habits with 90 days of history', async () => {
    const { db, habits } = await freshDb();
    await seedDevData(db, TODAY, NOW);
    const list = await habits.list();
    expect(list.map((h) => h.name)).toEqual(['Meditate', 'Drink water', 'Read', 'Run', 'Stretch']);
    const oldest = await db.get<{ day: string }>('SELECT MIN(day_key) AS day FROM completions');
    expect(oldest?.day).toBe(addDays(TODAY, -(SEED_DAYS - 1)));
  });

  it('replaces whatever was there before', async () => {
    const { db, habits } = await freshDb();
    await habits.create(input({ name: 'Old habit' }), TODAY, NOW);
    await seedDevData(db, TODAY, NOW);
    await seedDevData(db, TODAY, NOW); // twice: still just the 5
    expect(await habits.countActive()).toBe(5);
  });

  it('is the same every time', async () => {
    const one = await freshDb();
    const two = await freshDb();
    await seedDevData(one.db, TODAY, NOW);
    await seedDevData(two.db, TODAY, NOW);
    const sql = 'SELECT habit_id, day_key, count FROM completions ORDER BY habit_id, day_key';
    expect(await one.db.all(sql)).toEqual(await two.db.all(sql));
  });

  it('works with the Milestone 1 rules: Meditate is on a 12-day streak', async () => {
    const { db, habits, completions } = await freshDb();
    await seedDevData(db, TODAY, NOW);
    const meditate = (await habits.list()).find((h) => h.name === 'Meditate')!;
    const history = await completions.history(meditate.id);
    expect(history.freezes).toEqual([addDays(TODAY, -SEED_FREEZE_DAYS_AGO)]);
    expect(streaks(meditate, history, TODAY).current).toEqual({ count: 12, unit: 'days' });
  });

  it('looks realistic: habits are mostly but not always done', async () => {
    const { db, habits, completions } = await freshDb();
    await seedDevData(db, TODAY, NOW);
    for (const h of await habits.list()) {
      const r = completionRate(
        h,
        await completions.history(h.id),
        { start: '2026-01-01', end: TODAY },
        TODAY,
      );
      expect(r.rate, h.name).toBeGreaterThan(0.4);
      expect(r.rate, h.name).toBeLessThan(1);
    }
  });

  it('only records progress on days a habit is due', async () => {
    const { db } = await freshDb();
    await seedDevData(db, TODAY, NOW);
    // Read is Mon–Fri: SQLite's strftime('%w') gives 0 for Sunday, 6 for Saturday.
    const weekend = await db.all(
      "SELECT * FROM completions WHERE habit_id = 'seed-read' AND strftime('%w', day_key) IN ('0', '6')",
    );
    expect(weekend).toEqual([]);
  });
});
