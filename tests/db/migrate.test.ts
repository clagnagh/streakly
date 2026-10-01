import { describe, expect, it } from 'vitest';
import { migrate, schemaVersion } from '../../src/db/migrate.ts';
import { openNodeDb } from '../../src/db/nodeAdapter.ts';
import { LATEST_VERSION, type Migration } from '../../src/db/schema.ts';

describe('migrations', () => {
  it('a new database starts at version 0 and migrates to the latest', async () => {
    const db = openNodeDb();
    expect(await schemaVersion(db)).toBe(0);
    expect(await migrate(db)).toEqual([1]);
    expect(await schemaVersion(db)).toBe(LATEST_VERSION);
  });

  it('creates every table', async () => {
    const db = openNodeDb();
    await migrate(db);
    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual(['completions', 'freezes', 'habits', 'settings']);
  });

  it('running again does nothing (safe on every app start)', async () => {
    const db = openNodeDb();
    await migrate(db);
    expect(await migrate(db)).toEqual([]);
  });

  it('only runs the migrations a database has not had yet', async () => {
    const db = openNodeDb();
    const v1: Migration = { version: 1, name: 'one', sql: 'CREATE TABLE a (x)' };
    const v2: Migration = { version: 2, name: 'two', sql: 'CREATE TABLE b (x)' };
    expect(await migrate(db, [v1])).toEqual([1]);
    // Later, an app update ships migration 2.
    expect(await migrate(db, [v1, v2])).toEqual([2]);
    expect(await schemaVersion(db)).toBe(2);
  });

  it('a failed migration changes nothing, version included', async () => {
    const db = openNodeDb();
    const broken: Migration = {
      version: 1,
      name: 'broken',
      sql: 'CREATE TABLE a (x); CREATE TABLE a (x);',
    };
    await expect(migrate(db, [broken])).rejects.toThrow();
    expect(await schemaVersion(db)).toBe(0);
    expect(await db.all("SELECT name FROM sqlite_master WHERE name = 'a'")).toEqual([]);
  });

  it('refuses a database from a newer app version instead of damaging it', async () => {
    const db = openNodeDb();
    await db.run('PRAGMA user_version = 99');
    await expect(migrate(db)).rejects.toThrow(/newer version/);
  });
});
