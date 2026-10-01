// Opens the database once for the whole app and keeps track of its state:
// opening → ready, or "open in another tab", or an error. React components
// read it with useDatabase() (src/hooks/useDatabase.ts).

import { acquireTabLock } from './tabLock.ts';
import { createClient, DbError, type DbClient } from './client.ts';
import type { OpenInfo } from './protocol.ts';
import { createRepos, type Repos } from './repos.ts';
import { requestPersistence } from './storage.ts';

export type Connection = { db: DbClient; repos: Repos; info: OpenInfo };

export type DbState =
  | { status: 'idle' }
  | { status: 'opening' }
  | { status: 'ready'; connection: Connection }
  /** Another tab already has Streakly open. */
  | { status: 'otherTab' }
  /** This tab had it, but the user chose "Use it here" in another tab. */
  | { status: 'movedAway' }
  | { status: 'error'; error: DbError };

let state: DbState = { status: 'idle' };
const listeners = new Set<() => void>();

function setState(next: DbState) {
  state = next;
  listeners.forEach((l) => l());
}

export const getDbState = () => state;

export function subscribeDb(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function connect(wait: boolean): Promise<void> {
  setState({ status: 'opening' });
  let client: DbClient | undefined;
  const lock = await acquireTabLock(
    async () => {
      await client?.close();
      setState({ status: 'movedAway' });
    },
    { wait },
  );
  if (!lock) {
    setState({ status: 'otherTab' });
    return;
  }

  // The previous tab may take a moment to let go of the files: retry briefly.
  for (let attempt = 0; ; attempt++) {
    client = createClient();
    try {
      const info = await client.open();
      setState({ status: 'ready', connection: { db: client, repos: createRepos(client), info } });
      void requestPersistence();
      return;
    } catch (e) {
      await client.close().catch(() => {});
      const error = e instanceof DbError ? e : new DbError('unknown', String(e));
      if (error.code === 'locked' && attempt < 10) {
        await sleep(200);
        continue;
      }
      lock.release();
      setState({ status: 'error', error });
      return;
    }
  }
}

/** Opens the database if nothing has tried yet. Safe to call many times. */
export function startDatabase(): void {
  if (state.status === 'idle') void connect(false);
}

/** "Use it here": takes the database over from another tab. */
export function takeOverFromOtherTab(): void {
  void connect(true);
}
