import { describe, expect, it } from 'vitest';
import { NOW, TODAY, freshDb, input } from './helpers.ts';

describe('habits', () => {
  it('creates a habit and reads it back with real types', async () => {
    const { habits } = await freshDb();
    const h = await habits.create(
      input({ schedule: { kind: 'weekdays', days: [5, 1, 3] } }),
      TODAY,
      NOW,
    );
    expect(h).toMatchObject({
      name: 'Meditate',
      schedule: { kind: 'weekdays', days: [1, 3, 5] },
      createdDay: TODAY,
      archivedDay: null,
      sortOrder: 0,
    });
  });

  it('round-trips every schedule kind', async () => {
    const { habits } = await freshDb();
    for (const schedule of [
      { kind: 'daily' },
      { kind: 'weekdays', days: [0, 6] },
      { kind: 'timesPerWeek', times: 3 },
    ] as const) {
      const h = await habits.create(input({ schedule }), TODAY, NOW);
      expect(h.schedule).toEqual(schedule);
    }
  });

  it('adds new habits at the end, and reorders', async () => {
    const { habits } = await freshDb();
    const a = await habits.create(input({ name: 'A' }), TODAY, NOW);
    const b = await habits.create(input({ name: 'B' }), TODAY, NOW);
    const c = await habits.create(input({ name: 'C' }), TODAY, NOW);
    expect((await habits.list()).map((h) => h.name)).toEqual(['A', 'B', 'C']);
    await habits.reorder([c.id, a.id, b.id]);
    expect((await habits.list()).map((h) => h.name)).toEqual(['C', 'A', 'B']);
  });

  it('check habits always have a target of 1', async () => {
    const { habits } = await freshDb();
    const h = await habits.create(input({ type: 'check', targetCount: 8 }), TODAY, NOW);
    expect(h.targetCount).toBe(1);
  });

  it('updates a habit', async () => {
    const { habits } = await freshDb();
    const h = await habits.create(input(), TODAY, NOW);
    await habits.update(
      h.id,
      input({ name: '  Drink water ', type: 'count', targetCount: 8, unit: 'glasses' }),
    );
    expect(await habits.get(h.id)).toMatchObject({
      name: 'Drink water',
      targetCount: 8,
      unit: 'glasses',
    });
  });

  it('archiving keeps the habit and its history but hides it from the list', async () => {
    const { habits, completions } = await freshDb();
    const h = await habits.create(input(), TODAY, NOW);
    await completions.setCount(h.id, TODAY, 1, NOW);
    await habits.archive(h.id, TODAY);
    expect(await habits.list()).toEqual([]);
    expect(await habits.countActive()).toBe(0);
    expect(await habits.list({ includeArchived: true })).toHaveLength(1);
    expect((await completions.history(h.id)).completions).toHaveLength(1);
    await habits.unarchive(h.id);
    expect(await habits.countActive()).toBe(1);
  });

  it('deleting a habit removes its completions and freezes too (cascade)', async () => {
    const { db, habits, completions } = await freshDb();
    const h = await habits.create(input(), TODAY, NOW);
    await completions.setCount(h.id, '2026-09-29', 1, NOW);
    await completions.addFreeze(h.id, '2026-09-28');
    await habits.remove(h.id);
    expect(await db.all('SELECT * FROM completions')).toEqual([]);
    expect(await db.all('SELECT * FROM freezes')).toEqual([]);
  });
});

describe('completions', () => {
  it('there is only ever one record per habit per day', async () => {
    const { db, habits, completions } = await freshDb();
    const h = await habits.create(input({ type: 'count', targetCount: 8 }), TODAY, NOW);
    await completions.setCount(h.id, TODAY, 3, NOW);
    await completions.setCount(h.id, TODAY, 5, NOW);
    expect(await db.all('SELECT * FROM completions')).toHaveLength(1);
    expect(await completions.countOn(h.id, TODAY)).toBe(5);
  });

  it('the database itself refuses a second record for the same day', async () => {
    const { db, habits } = await freshDb();
    const h = await habits.create(input(), TODAY, NOW);
    const insert =
      'INSERT INTO completions (id, habit_id, day_key, count, created_at) VALUES (?, ?, ?, 1, ?)';
    await db.run(insert, ['one', h.id, TODAY, NOW]);
    await expect(db.run(insert, ['two', h.id, TODAY, NOW])).rejects.toThrow(/UNIQUE/);
  });

  it('the database refuses progress for a habit that does not exist', async () => {
    const { completions } = await freshDb();
    await expect(completions.setCount('nope', TODAY, 1, NOW)).rejects.toThrow(/FOREIGN KEY/);
  });

  it('the database refuses a badly formatted day', async () => {
    const { habits, completions } = await freshDb();
    const h = await habits.create(input(), TODAY, NOW);
    await expect(completions.setCount(h.id, '30/09/2026', 1, NOW)).rejects.toThrow(/CHECK/);
  });

  it('setting 0 removes the record ("not done" is no row)', async () => {
    const { db, habits, completions } = await freshDb();
    const h = await habits.create(input(), TODAY, NOW);
    await completions.setCount(h.id, TODAY, 1, NOW);
    await completions.setCount(h.id, TODAY, 0, NOW);
    expect(await db.all('SELECT * FROM completions')).toEqual([]);
  });

  it('increments and decrements, never below 0', async () => {
    const { habits, completions } = await freshDb();
    const h = await habits.create(input({ type: 'count', targetCount: 8 }), TODAY, NOW);
    expect(await completions.increment(h.id, TODAY, NOW)).toBe(1);
    expect(await completions.increment(h.id, TODAY, NOW, 2)).toBe(3);
    expect(await completions.increment(h.id, TODAY, NOW, -5)).toBe(0);
  });

  it('reads one habit’s history for the rules, and a day or range for screens', async () => {
    const { habits, completions } = await freshDb();
    const a = await habits.create(input({ name: 'A' }), TODAY, NOW);
    const b = await habits.create(input({ name: 'B' }), TODAY, NOW);
    await completions.setCount(a.id, '2026-09-28', 1, NOW);
    await completions.setCount(a.id, TODAY, 1, NOW);
    await completions.setCount(b.id, TODAY, 1, NOW);
    await completions.addFreeze(a.id, '2026-09-29');
    await completions.addFreeze(a.id, '2026-09-29'); // twice is fine

    expect(await completions.history(a.id)).toEqual({
      completions: [
        { dayKey: '2026-09-28', count: 1 },
        { dayKey: TODAY, count: 1 },
      ],
      freezes: ['2026-09-29'],
    });
    expect(await completions.onDay(TODAY)).toHaveLength(2);
    expect(await completions.between({ start: '2026-09-28', end: '2026-09-29' })).toHaveLength(1);

    await completions.removeFreeze(a.id, '2026-09-29');
    expect((await completions.history(a.id)).freezes).toEqual([]);
  });
});

describe('settings', () => {
  it('returns defaults until something is saved', async () => {
    const { settings } = await freshDb();
    expect(await settings.get('dayStartHour')).toBe(4);
    expect(await settings.get('weekStartsOn')).toBe(1);
    expect(await settings.get('theme')).toBe('system');
  });

  it('saves and reads back real types, not text', async () => {
    const { settings } = await freshDb();
    await settings.set('dayStartHour', 5);
    await settings.set('hapticsEnabled', false);
    await settings.set('freezeAllowance', { remaining: 1, month: '2026-09' });
    expect(await settings.get('dayStartHour')).toBe(5);
    const all = await settings.getAll();
    expect(all).toMatchObject({
      dayStartHour: 5,
      hapticsEnabled: false,
      freezeAllowance: { remaining: 1, month: '2026-09' },
      theme: 'system',
    });
  });

  it('falls back to the default if a stored value is damaged', async () => {
    const { db, settings } = await freshDb();
    await db.run("INSERT INTO settings (key, value) VALUES ('dayStartHour', 'not json')");
    await db.run("INSERT INTO settings (key, value) VALUES ('hapticsEnabled', '\"yes\"')");
    expect(await settings.get('dayStartHour')).toBe(4);
    expect(await settings.get('hapticsEnabled')).toBe(true);
  });
});
