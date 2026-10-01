// The database worker: SQLite runs here, off the main thread, so a slow query
// can never freeze taps and animations. The app talks to it with messages
// (see client.ts and protocol.ts).
//
// Storage is the browser's private file system for this site (OPFS), through
// SQLite's "opfs-sahpool" option, which works without special server headers
// (so it works on GitHub Pages). Only one tab can hold the files at a time;
// tabLock.ts makes sure tabs take turns.

import sqlite3InitModule, {
  type Database,
  type SAHPoolUtil,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import type { Db, Row, SqlValue, Statement } from './adapter.ts';
import { migrate, schemaVersion } from './migrate.ts';
import { classifyError, type OpenInfo, type Request, type Response } from './protocol.ts';

const FILE = '/streakly.sqlite3';

let sqlite3: Sqlite3Static | undefined;
let pool: SAHPoolUtil | undefined;
let db: Database | undefined;

/** The worker's own `Db`, straight onto SQLite (no messages needed in here). */
function direct(d: Database): Db {
  // SQLite WASM refuses an empty parameter list, so only pass one when there are params.
  const bind = (params: readonly SqlValue[]) => (params.length ? [...params] : undefined);
  const exec = ({ sql, params = [] }: Statement) => d.exec({ sql, bind: bind(params) });
  return {
    all: async <T = Row>(sql: string, params: readonly SqlValue[] = []) =>
      d.selectObjects(sql, bind(params)) as T[],
    get: async <T = Row>(sql: string, params: readonly SqlValue[] = []) =>
      d.selectObject(sql, bind(params)) as T | undefined,
    run: async (sql: string, params: readonly SqlValue[] = []) => {
      exec({ sql, params });
      return d.changes();
    },
    batch: async (statements: readonly Statement[]) => {
      d.transaction(() => statements.forEach(exec));
    },
  };
}

async function open(): Promise<OpenInfo> {
  if (!db) {
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
      throw Object.assign(new Error('OPFS is not available'), { name: 'unsupported' });
    }
    sqlite3 ??= await sqlite3InitModule();
    pool = pool?.isPaused()
      ? await pool.unpauseVfs()
      : (pool ?? (await sqlite3.installOpfsSAHPoolVfs({})));
    db = new pool.OpfsSAHPoolDb(FILE);
    db.exec('PRAGMA foreign_keys = ON');
    try {
      await migrate(direct(db));
    } catch (e) {
      db.close();
      db = undefined;
      throw e;
    }
  }
  return {
    schemaVersion: await schemaVersion(direct(db)),
    sqliteVersion: sqlite3!.version.libVersion,
  };
}

/** Closes the database and lets go of the files, so another tab can open them. */
function close(): void {
  db?.close();
  db = undefined;
  if (pool && !pool.isPaused()) pool.pauseVfs();
}

/** For the #/dev/db SQL box: runs one statement, refusing anything that writes. */
function readOnlyQuery(d: Database, sql: string): Row[] {
  const stmt = d.prepare(sql);
  try {
    if (!sqlite3!.capi.sqlite3_stmt_readonly(stmt.pointer!)) {
      throw Object.assign(new Error('Only SELECT queries are allowed here.'), { name: 'readonly' });
    }
    const rows: Row[] = [];
    while (stmt.step()) rows.push(stmt.get({}) as Row);
    return rows;
  } finally {
    stmt.finalize();
  }
}

async function handle(req: Request): Promise<unknown> {
  if (req.type === 'open') return open();
  if (req.type === 'close') return close();
  if (!db) throw new Error('The database is not open');
  const d = direct(db);
  switch (req.type) {
    case 'all':
      return d.all(req.sql, req.params);
    case 'get':
      return d.get(req.sql, req.params);
    case 'run':
      return d.run(req.sql, req.params);
    case 'batch':
      return d.batch(req.statements);
    case 'query':
      return readOnlyQuery(db, req.sql);
  }
}

// Requests are handled strictly one at a time, in order, so a batch can never
// interleave with another write.
let queue: Promise<unknown> = Promise.resolve();

self.onmessage = (event: MessageEvent<Request>) => {
  const req = event.data;
  queue = queue.then(async () => {
    let res: Response;
    try {
      res = { id: req.id, ok: true, result: await handle(req) };
    } catch (e) {
      const err = e as Error;
      const code =
        err?.name === 'unsupported' || err?.name === 'readonly' ? err.name : classifyError(e);
      res = { id: req.id, ok: false, error: { code, message: err?.message ?? String(e) } };
    }
    self.postMessage(res);
  });
};
