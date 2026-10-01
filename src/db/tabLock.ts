// Only one tab may use the database at a time (two tabs writing at once could
// overwrite each other, and SQLite's browser storage only allows one user).
//
// The Web Locks API gives us a named lock that only one tab can hold. A
// second tab asks politely over a BroadcastChannel; the first tab closes its
// database, then lets go, and the second tab gets the lock.

const LOCK_NAME = 'streakly-db';
const CHANNEL_NAME = 'streakly-tabs';

export type TabLock = { release(): void };

/**
 * Tries to become the tab that owns the database.
 * - `wait: false` (normal start): resolves to null at once if another tab has it.
 * - `wait: true` ("Use it here"): asks the other tab to let go, then waits.
 * `beforeHandover` runs when another tab asks for the lock; close the
 * database in it. The lock is released after it finishes.
 */
export async function acquireTabLock(
  beforeHandover: () => Promise<void>,
  { wait = false } = {},
): Promise<TabLock | null> {
  if (!('locks' in navigator)) return { release() {} }; // very old browser: no locking

  const channel = new BroadcastChannel(CHANNEL_NAME);
  if (wait) channel.postMessage('please-release');

  return new Promise<TabLock | null>((resolveLock) => {
    void navigator.locks.request(LOCK_NAME, { ifAvailable: !wait }, async (lock) => {
      if (!lock) {
        channel.close();
        resolveLock(null);
        return;
      }
      // Hold the lock until release() is called.
      await new Promise<void>((release) => {
        channel.onmessage = async (event) => {
          if (event.data !== 'please-release') return;
          try {
            await beforeHandover();
          } finally {
            release();
          }
        };
        resolveLock({ release });
      });
      channel.close();
    });
  });
}
