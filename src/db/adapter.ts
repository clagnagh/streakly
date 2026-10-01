// The one interface every database in the app implements. Repositories only
// ever talk to a `Db`, so the same SQL runs against SQLite in the browser (via
// the worker, client.ts) and against node:sqlite in tests (nodeAdapter.ts).

export type SqlValue = string | number | null;

export type Statement = { sql: string; params?: readonly SqlValue[] };

export type Row = Record<string, SqlValue>;

export interface Db {
  /** Every row the query returns. */
  all<T = Row>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  /** The first row, or undefined. */
  get<T = Row>(sql: string, params?: readonly SqlValue[]): Promise<T | undefined>;
  /** Runs a statement that changes data; resolves to how many rows changed. */
  run(sql: string, params?: readonly SqlValue[]): Promise<number>;
  /**
   * Runs several statements as one transaction: all of them happen, or none
   * do. A statement without params may contain several SQL statements (used
   * by migrations).
   */
  batch(statements: readonly Statement[]): Promise<void>;
}
