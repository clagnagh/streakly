import { describe, expect, it, vi } from 'vitest';
import { countOn } from '../../src/core/index.ts';
import { migrate } from '../../src/db/migrate.ts';
import { openNodeDb } from '../../src/db/nodeAdapter.ts';
import { createRepos } from '../../src/db/repos.ts';
import { seedDevData } from '../../src/db/seed.ts';
import type { Clock } from '../../src/store/clock.ts';
import { createHabitStore } from '../../src/store/habitStore.ts';
import { dayProgress, habitDetail, todayItems } from '../../src/store/selectors.ts';
import { input } from '../db/helpers.ts';

/** A clock we can move by hand. Starts Wed 30 Sep 2026, 10:00 in London. */
function testClock(iso = '2026-09-30T09:00:00Z') {
  let now = new Date(iso);
  const clock: Clock = { now: () => now, timeZone: () => 'Europe/London' };
  return { clock, set: (next: string) => (now = new Date(next)) };
}

async function setup() {
  const db = openNodeDb();
  await migrate(db);
  const repos = createRepos(db);
  const { clock, set } = testClock();
  const store = createHabitStore(repos, clock);
  await store.getState().load();
  /** A second store over the same database: what you'd see after a reload. */
  const reload = async () => {
    const fresh = createHabitStore(repos, clock);
    await fresh.getState().load();
    return fresh.getState();
  };
  return { db, repos, store, s: () => store.getState(), setClock: set, reload };
}

describe('habit store', () => {
  it('loads empty, with today from the clock', async () => {
    const { s } = await setup();
    expect(s()).toMatchObject({ loaded: true, today: '2026-09-30', habits: [] });
  });

  it('creates a habit and completes it; a reload still shows it done', async () => {
    const { s, reload } = await setup();
    const h = await s().createHabit(input());
    expect(h.createdDay).toBe('2026-09-30');
    await s().toggleComplete(h.id);
    expect(todayItems(s().habits, s().histories, s().today, 1)[0]).toMatchObject({
      done: true,
      streak: { count: 1, unit: 'days' },
    });
    const after = await reload();
    expect(countOn(after.histories[h.id]!, '2026-09-30')).toBe(1);
  });

  it('toggling again marks it not done', async () => {
    const { s, reload } = await setup();
    const h = await s().createHabit(input());
    await s().toggleComplete(h.id);
    await s().toggleComplete(h.id);
    expect(countOn(s().histories[h.id]!, s().today)).toBe(0);
    expect((await reload()).histories[h.id]).toBeUndefined();
  });

  it('count habits step up and down, never below 0', async () => {
    const { s } = await setup();
    const h = await s().createHabit(input({ type: 'count', targetCount: 3, unit: 'glasses' }));
    await s().incrementCount(h.id, 1);
    await s().incrementCount(h.id, 1);
    expect(todayItems(s().habits, s().histories, s().today, 1)[0]).toMatchObject({
      count: 2,
      done: false,
    });
    await s().incrementCount(h.id, 1);
    expect(todayItems(s().habits, s().histories, s().today, 1)[0]!.done).toBe(true);
    await s().incrementCount(h.id, -5);
    expect(countOn(s().histories[h.id]!, s().today)).toBe(0);
  });

  it('editing past days updates the streak', async () => {
    const { s } = await setup();
    const h = await s().createHabit(input());
    await s().setCompletionForDay(h.id, '2026-09-28', 1);
    await s().setCompletionForDay(h.id, '2026-09-29', 1);
    const streak = () => habitDetail(h, s().histories[h.id], s().today, 1).streaks.current.count;
    expect(streak()).toBe(2); // today not done yet: still yesterday's streak
    await s().toggleComplete(h.id);
    expect(streak()).toBe(3);
    await s().setCompletionForDay(h.id, '2026-09-29', 0);
    expect(streak()).toBe(1);
  });

  it('ignores future days', async () => {
    const { s } = await setup();
    const h = await s().createHabit(input());
    await s().setCompletionForDay(h.id, '2026-10-01', 1);
    expect(s().histories[h.id]).toBeUndefined();
  });

  it('rolls over to the new day when the clock passes the day start', async () => {
    const { s, setClock } = await setup();
    const h = await s().createHabit(input());
    await s().toggleComplete(h.id);
    setClock('2026-10-01T01:30:00Z'); // 02:30 in London: still Wednesday (day starts at 4)
    s().refreshToday();
    expect(s().today).toBe('2026-09-30');
    setClock('2026-10-01T07:00:00Z'); // 08:00 Thursday
    s().refreshToday();
    expect(s().today).toBe('2026-10-01');
    expect(todayItems(s().habits, s().histories, s().today, 1)[0]).toMatchObject({
      done: false,
      streak: { count: 1 },
    });
  });

  it('updates, archives, restores and deletes habits', async () => {
    const { s, db, reload } = await setup();
    const h = await s().createHabit(input());
    await s().updateHabit(h.id, input({ name: 'Breathe' }));
    expect(s().habits[0]!.name).toBe('Breathe');

    await s().archiveHabit(h.id);
    expect(todayItems(s().habits, s().histories, s().today, 1)).toEqual([]);
    expect((await reload()).habits[0]!.archivedDay).toBe('2026-09-30');

    await s().unarchiveHabit(h.id);
    expect(todayItems(s().habits, s().histories, s().today, 1)).toHaveLength(1);

    await s().toggleComplete(h.id);
    await s().deleteHabit(h.id);
    expect(s().habits).toEqual([]);
    expect(await db.all('SELECT * FROM completions')).toEqual([]);
  });

  it('reorders habits and keeps the order after a reload', async () => {
    const { s, reload } = await setup();
    const a = await s().createHabit(input({ name: 'A' }));
    const b = await s().createHabit(input({ name: 'B' }));
    const c = await s().createHabit(input({ name: 'C' }));
    await s().reorderHabits([c.id, a.id, b.id]);
    expect(s().habits.map((h) => h.name)).toEqual(['C', 'A', 'B']);
    expect((await reload()).habits.map((h) => h.name)).toEqual(['C', 'A', 'B']);
  });

  it('if saving fails, the change is undone and a friendly message is shown', async () => {
    const { s, repos } = await setup();
    const h = await s().createHabit(input());
    vi.spyOn(repos.completions, 'setCount').mockRejectedValueOnce(new Error('disk on fire'));
    await s().toggleComplete(h.id);
    expect(s().histories[h.id]).toBeUndefined();
    expect(s().error).toMatch(/couldn't save/);
    s().dismissError();
    expect(s().error).toBeNull();
  });

  it('shows the change before the save finishes (optimistic)', async () => {
    const { s, repos } = await setup();
    const h = await s().createHabit(input());
    let finishSave!: () => void;
    vi.spyOn(repos.completions, 'setCount').mockReturnValueOnce(
      new Promise<void>((resolve) => (finishSave = resolve)),
    );
    const pending = s().toggleComplete(h.id);
    expect(countOn(s().histories[h.id]!, s().today)).toBe(1); // already on screen
    finishSave();
    await pending;
  });
});

describe('selectors on the sample data', () => {
  it('Today lists the habits due today with progress', async () => {
    const { db, s, store } = await setup();
    await seedDevData(db, '2026-09-30', '2026-09-30T09:00:00Z');
    await store.getState().load();
    const items = todayItems(s().habits, s().histories, s().today, 1);
    // Wednesday: Stretch (Mon/Wed/Fri) and Read (Mon–Fri) are due, so all 5 are.
    expect(items.map((i) => i.habit.name)).toEqual([
      'Meditate',
      'Drink water',
      'Read',
      'Run',
      'Stretch',
    ]);
    expect(items.find((i) => i.habit.name === 'Meditate')).toMatchObject({
      done: false,
      streak: { count: 12 },
    });
    expect(items.find((i) => i.habit.name === 'Drink water')).toMatchObject({
      count: 3,
      done: false,
    });
    expect(items.find((i) => i.habit.name === 'Run')!.week).toMatchObject({ times: 3 });
    const p = dayProgress(items);
    expect(p.total).toBe(5);
  });
});
