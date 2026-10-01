// Messages between the app (client.ts) and the database worker (worker.ts).

import type { SqlValue, Statement } from './adapter.ts';

export type DbErrorCode =
  | 'unsupported' // this browser can't store data this way
  | 'locked' // another tab has the database open
  | 'full' // the device or browser storage is full
  | 'corrupt' // the database file is damaged
  | 'newer' // saved by a newer version of the app
  | 'readonly' // a write was sent to the read-only query box
  | 'unknown';

export type OpenInfo = { schemaVersion: number; sqliteVersion: string };

export type Request =
  | { id: number; type: 'open' }
  | { id: number; type: 'all' | 'get' | 'run'; sql: string; params: readonly SqlValue[] }
  | { id: number; type: 'batch'; statements: readonly Statement[] }
  | { id: number; type: 'query'; sql: string }
  | { id: number; type: 'close' };

export type Response =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: { code: DbErrorCode; message: string } };

/** Turns whatever went wrong into one of our codes. */
export function classifyError(e: unknown): DbErrorCode {
  const text = `${(e as Error)?.name ?? ''} ${(e as Error)?.message ?? String(e)}`;
  if (/newer version/i.test(text)) return 'newer';
  if (/QuotaExceeded|SQLITE_FULL|database or disk is full/i.test(text)) return 'full';
  if (/SQLITE_CORRUPT|SQLITE_NOTADB|malformed|not a database/i.test(text)) return 'corrupt';
  if (/NoModificationAllowed|Access Handle|createSyncAccessHandle|SQLITE_BUSY|locked/i.test(text))
    return 'locked';
  return 'unknown';
}
