// The database schema, as numbered migrations.
//
// A migration is a step that changes the database from one version to the
// next. Once a version has shipped, NEVER edit it: people's databases have
// already run it. To change the schema, add a new migration at the end.
// migrate.ts runs whichever ones a database hasn't had yet.

export type Migration = { version: number; name: string; sql: string };

// Day keys are "YYYY-MM-DD"; this pattern makes the database reject anything else.
const DAY = `GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`;

export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: 'Create habits, completions, freezes and settings',
    sql: `
      CREATE TABLE habits (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        emoji           TEXT,
        color_key       TEXT NOT NULL,
        type            TEXT NOT NULL CHECK (type IN ('check', 'count')),
        target_count    INTEGER NOT NULL DEFAULT 1 CHECK (target_count >= 1),
        unit            TEXT,
        schedule_kind   TEXT NOT NULL CHECK (schedule_kind IN ('daily', 'weekdays', 'times_per_week')),
        schedule_days   TEXT,
        times_per_week  INTEGER CHECK (times_per_week BETWEEN 1 AND 7),
        reminder_time   TEXT,
        sort_order      INTEGER NOT NULL,
        created_day     TEXT NOT NULL CHECK (created_day ${DAY}),
        archived_day    TEXT CHECK (archived_day ${DAY}),
        created_at      TEXT NOT NULL
      );

      CREATE TABLE completions (
        id          TEXT PRIMARY KEY,
        habit_id    TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        day_key     TEXT NOT NULL CHECK (day_key ${DAY}),
        count       INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1),
        created_at  TEXT NOT NULL,
        UNIQUE (habit_id, day_key)
      );
      CREATE INDEX completions_by_day ON completions(day_key);

      CREATE TABLE freezes (
        habit_id  TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        day_key   TEXT NOT NULL CHECK (day_key ${DAY}),
        PRIMARY KEY (habit_id, day_key)
      );

      CREATE TABLE settings (
        key    TEXT PRIMARY KEY,
        value  TEXT NOT NULL
      );
    `,
  },
];

/** The version a fully migrated database is at. */
export const LATEST_VERSION = migrations.at(-1)?.version ?? 0;
