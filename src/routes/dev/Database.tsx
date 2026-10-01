// #/dev/db — look inside the database: counts, sample data, and a read-only
// SQL box for practising queries. Hidden (not linked); removed in Milestone 9.

import { useCallback, useEffect, useState } from 'react';
import { dayKey } from '../../core/index.ts';
import type { Row } from '../../db/adapter.ts';
import { DbError } from '../../db/client.ts';
import { takeOverFromOtherTab, type Connection } from '../../db/connection.ts';
import { clearAll, tableCounts, TABLES } from '../../db/devTools.ts';
import { seedDevData } from '../../db/seed.ts';
import { useDatabase } from '../../hooks/useDatabase.ts';
import { StorageNote } from '../../components/StorageNote.tsx';
import styles from './Database.module.css';

const EXAMPLES = [
  'SELECT name, emoji, schedule_kind FROM habits ORDER BY sort_order',
  `SELECT h.name, COUNT(*) AS days_done
FROM completions c JOIN habits h ON h.id = c.habit_id
GROUP BY h.id ORDER BY days_done DESC`,
  `SELECT day_key, count FROM completions
WHERE habit_id = 'seed-water' ORDER BY day_key DESC LIMIT 7`,
];

const MAX_ROWS = 200;

function today() {
  // Uses the device's time zone and the default 4 a.m. day start.
  return dayKey(new Date(), 4, Intl.DateTimeFormat().resolvedOptions().timeZone);
}

function Ready({ connection }: { connection: Connection }) {
  const { db, info } = connection;
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState(false);
  const [sql, setSql] = useState(EXAMPLES[0]!);
  const [result, setResult] = useState<{ rows: Row[] } | { error: string } | null>(null);

  const refresh = useCallback(() => void tableCounts(db).then(setCounts), [db]);
  useEffect(refresh, [refresh]);

  async function act(confirmText: string, action: () => Promise<void>) {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
      refresh();
    }
  }

  async function runQuery() {
    try {
      setResult({ rows: await db.query(sql) });
    } catch (e) {
      setResult({ error: e instanceof DbError ? `${e.friendly} (${e.message})` : String(e) });
    }
  }

  const rows = result && 'rows' in result ? result.rows : [];
  const columns = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.h2}>Status</h2>
        <p className={styles.meta}>
          SQLite {info.sqliteVersion} · schema version{' '}
          <span data-testid="schema-version">{info.schemaVersion}</span>
        </p>
        <StorageNote />
      </section>

      <section className={styles.card}>
        <h2 className={styles.h2}>Tables</h2>
        <dl className={styles.counts}>
          {TABLES.map((t) => (
            <div key={t} className={styles.count}>
              <dt className={styles.meta}>{t}</dt>
              <dd data-testid={`count-${t}`}>{counts?.[t] ?? '…'}</dd>
            </div>
          ))}
        </dl>
        <div className={styles.buttons}>
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() =>
              act('Replace everything with the sample habits?', () =>
                seedDevData(db, today(), new Date().toISOString()),
              )
            }
          >
            Load sample data
          </button>
          <button
            className={styles.secondary}
            disabled={busy}
            onClick={() =>
              act('Delete every habit and setting in this browser?', () => clearAll(db))
            }
          >
            Clear everything
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.h2}>Ask the database</h2>
        <p className={styles.meta}>Read-only: SELECT queries only. Try an example:</p>
        <div className={styles.examples}>
          {EXAMPLES.map((ex, i) => (
            <button key={i} className={styles.chip} onClick={() => setSql(ex)}>
              Example {i + 1}
            </button>
          ))}
        </div>
        <textarea
          className={styles.sql}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={6}
          spellCheck={false}
          aria-label="SQL query"
        />
        <div className={styles.buttons}>
          <button className={styles.primary} onClick={runQuery}>
            Run
          </button>
        </div>
        {result && 'error' in result && (
          <p className={styles.error} role="alert">
            {result.error}
          </p>
        )}
        {result && 'rows' in result && (
          <>
            <p className={styles.meta} data-testid="row-count">
              {rows.length} {rows.length === 1 ? 'row' : 'rows'}
              {rows.length > MAX_ROWS && ` (showing the first ${MAX_ROWS})`}
            </p>
            {rows.length > 0 && (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {columns.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, MAX_ROWS).map((r, i) => (
                      <tr key={i}>
                        {columns.map((c) => (
                          <td key={c}>{r[c] === null ? 'NULL' : String(r[c])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

export function Database() {
  const state = useDatabase();

  return (
    <main className={styles.page}>
      <header>
        <h1 className={styles.title}>Database</h1>
        <p className={styles.meta}>Everything here is stored in this browser only.</p>
      </header>

      {(state.status === 'idle' || state.status === 'opening') && (
        <p className={styles.meta}>Opening…</p>
      )}

      {(state.status === 'otherTab' || state.status === 'movedAway') && (
        <section className={styles.card} role="status">
          <h2 className={styles.h2}>
            {state.status === 'otherTab'
              ? 'Streakly is open in another tab'
              : 'Streakly moved to another tab'}
          </h2>
          <p className={styles.meta}>
            To keep your habits safe, Streakly works in one tab at a time.
          </p>
          <div className={styles.buttons}>
            <button className={styles.primary} onClick={takeOverFromOtherTab}>
              Use it here
            </button>
          </div>
        </section>
      )}

      {state.status === 'error' && (
        <section className={styles.card} role="alert">
          <h2 className={styles.h2}>We couldn't open your habits</h2>
          <p>{state.error.friendly}</p>
          <p className={styles.meta}>Details: {state.error.message}</p>
        </section>
      )}

      {state.status === 'ready' && <Ready connection={state.connection} />}
    </main>
  );
}
