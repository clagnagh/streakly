// Database helpers for the hidden #/dev/db page only.

import type { Db } from './adapter.ts';

export const TABLES = ['habits', 'completions', 'freezes', 'settings'] as const;

export async function tableCounts(db: Db): Promise<Record<(typeof TABLES)[number], number>> {
  const entries = await Promise.all(
    TABLES.map(async (t) => {
      const row = await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`);
      return [t, row?.n ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<(typeof TABLES)[number], number>;
}

/** Deletes every habit (and so all history) and every setting. */
export async function clearAll(db: Db): Promise<void> {
  await db.batch([{ sql: 'DELETE FROM habits' }, { sql: 'DELETE FROM settings' }]);
}
