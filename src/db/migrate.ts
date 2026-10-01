// Brings a database up to the latest schema.
//
// SQLite keeps a spare number in every database file, `PRAGMA user_version`
// (0 for a brand-new file). We use it as the schema version: each migration
// runs in a transaction together with bumping that number, so a migration is
// either fully applied or not at all, even if the tab closes halfway.

import type { Db } from './adapter.ts';
import { migrations, type Migration } from './schema.ts';

export async function schemaVersion(db: Db): Promise<number> {
  const row = await db.get<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/** Runs pending migrations in order. Resolves to the versions it applied. */
export async function migrate(db: Db, all: readonly Migration[] = migrations): Promise<number[]> {
  const current = await schemaVersion(db);
  const latest = all.at(-1)?.version ?? 0;
  if (current > latest) {
    throw new Error(
      `This database was saved by a newer version of Streakly (schema ${current}). Refresh to update the app.`,
    );
  }

  const applied: number[] = [];
  for (const m of all) {
    if (m.version <= current) continue;
    await db.batch([{ sql: m.sql }, { sql: `PRAGMA user_version = ${m.version}` }]);
    applied.push(m.version);
  }
  return applied;
}
