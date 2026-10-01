// A `Db` backed by Node's built-in SQLite, for tests. Never imported by the app.

import { DatabaseSync } from 'node:sqlite';
import type { Db, Row, SqlValue, Statement } from './adapter.ts';

/** Opens a database (in memory by default) with foreign keys on. */
export function openNodeDb(path = ':memory:'): Db & { close(): void } {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');

  const exec = ({ sql, params = [] }: Statement) => {
    if (params.length === 0) db.exec(sql);
    else db.prepare(sql).run(...params);
  };

  return {
    async all<T = Row>(sql: string, params: readonly SqlValue[] = []) {
      return db.prepare(sql).all(...params) as T[];
    },
    async get<T = Row>(sql: string, params: readonly SqlValue[] = []) {
      return db.prepare(sql).get(...params) as T | undefined;
    },
    async run(sql: string, params: readonly SqlValue[] = []) {
      return Number(db.prepare(sql).run(...params).changes);
    },
    async batch(statements: readonly Statement[]) {
      db.exec('BEGIN');
      try {
        statements.forEach(exec);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    close: () => db.close(),
  };
}
