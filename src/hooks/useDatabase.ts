import { useEffect, useSyncExternalStore } from 'react';
import { getDbState, startDatabase, subscribeDb } from '../db/connection.ts';

/** The database's current state; opens it on first use. */
export function useDatabase() {
  const state = useSyncExternalStore(subscribeDb, getDbState);
  useEffect(startDatabase, []);
  return state;
}
