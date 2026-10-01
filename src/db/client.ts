// The app's side of the database: a `Db` that forwards every call to the
// worker and waits for its answer, so callers just `await db.all(...)`.

import type { Db, Row, SqlValue, Statement } from './adapter.ts';
import type { DbErrorCode, OpenInfo, Request, Response } from './protocol.ts';

/** What to tell people, in the app's warm tone, for each kind of failure. */
export const friendlyMessages: Record<DbErrorCode, string> = {
  unsupported:
    "This browser can't save your habits. Try a recent version of Chrome, Safari, Edge or Firefox.",
  locked: 'Streakly is open in another tab or window. Close it, then try again.',
  full: "Your device is out of storage space, so we couldn't save. Freeing up some space will fix it.",
  corrupt: "Something's wrong with the saved data on this device.",
  newer: 'Your data was saved by a newer version of Streakly. Refresh the page to update.',
  readonly: 'Only SELECT queries are allowed here.',
  unknown: "Something went wrong while saving. Your earlier data hasn't been touched.",
};

export class DbError extends Error {
  readonly code: DbErrorCode;
  readonly friendly: string;
  constructor(code: DbErrorCode, detail: string) {
    super(detail);
    this.name = 'DbError';
    this.code = code;
    this.friendly = friendlyMessages[code];
  }
}

// Spread over Omit<Request, 'id'> so each request type keeps its own fields.
type Outgoing = Request extends infer R ? (R extends Request ? Omit<R, 'id'> : never) : never;

export type DbClient = Db & {
  open(): Promise<OpenInfo>;
  /** Read-only SQL for the #/dev/db page. */
  query(sql: string): Promise<Row[]>;
  /** Closes the database and stops the worker. */
  close(): Promise<void>;
};

export function createClient(): DbClient {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: unknown) => void }
  >();
  let nextId = 1;

  worker.onmessage = (event: MessageEvent<Response>) => {
    const res = event.data;
    const p = pending.get(res.id);
    if (!p) return;
    pending.delete(res.id);
    if (res.ok) p.resolve(res.result);
    else p.reject(new DbError(res.error.code, res.error.message));
  };

  // The worker script itself failed to load or crashed.
  worker.onerror = (event) => {
    event.preventDefault();
    for (const p of pending.values()) p.reject(new DbError('unknown', event.message));
    pending.clear();
  };

  function send<T>(req: Outgoing): Promise<T> {
    const id = nextId++;
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      worker.postMessage({ ...req, id });
    });
  }

  return {
    open: () => send<OpenInfo>({ type: 'open' }),
    all: <T = Row>(sql: string, params: readonly SqlValue[] = []) =>
      send<T[]>({ type: 'all', sql, params }),
    get: <T = Row>(sql: string, params: readonly SqlValue[] = []) =>
      send<T | undefined>({ type: 'get', sql, params }),
    run: (sql: string, params: readonly SqlValue[] = []) =>
      send<number>({ type: 'run', sql, params }),
    batch: (statements: readonly Statement[]) => send<void>({ type: 'batch', statements }),
    query: (sql: string) => send<Row[]>({ type: 'query', sql }),
    close: async () => {
      try {
        await send<void>({ type: 'close' });
      } finally {
        worker.terminate();
      }
    },
  };
}
