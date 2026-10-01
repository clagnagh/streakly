import { migrate } from '../../src/db/migrate.ts';
import { openNodeDb } from '../../src/db/nodeAdapter.ts';
import { createRepos } from '../../src/db/repos.ts';
import type { HabitInput } from '../../src/db/habitsRepo.ts';

export const TODAY = '2026-09-30';
export const NOW = '2026-09-30T08:00:00.000Z';

/** A fresh, fully migrated in-memory database with every repository. */
export async function freshDb() {
  const db = openNodeDb();
  await migrate(db);
  return { db, ...createRepos(db) };
}

export function input(over: Partial<HabitInput> = {}): HabitInput {
  return {
    name: 'Meditate',
    emoji: '🧘',
    colorKey: 'teal',
    type: 'check',
    targetCount: 1,
    unit: null,
    schedule: { kind: 'daily' },
    reminderTime: null,
    ...over,
  };
}
