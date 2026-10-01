// Makes the store available to every page below <StoreProvider>.

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useStore } from 'zustand';
import type { Repos } from '../db/repos.ts';
import { systemClock } from './clock.ts';
import { createHabitStore, type HabitStore, type HabitStoreApi } from './habitStore.ts';

const StoreContext = createContext<HabitStoreApi | null>(null);

export function StoreProvider({ repos, children }: { repos: Repos; children: ReactNode }) {
  // A new store for each database connection (e.g. after "Use it here").
  const store = useMemo(() => createHabitStore(repos, systemClock), [repos]);
  useEffect(() => {
    void store.getState().load();
  }, [store]);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useHabitStoreApi(): HabitStoreApi {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useHabitStore must be used inside <StoreProvider>');
  return store;
}

/** Reads part of the store; the component re-renders only when that part changes. */
export function useHabitStore<T>(selector: (state: HabitStore) => T): T {
  return useStore(useHabitStoreApi(), selector);
}

/** The store's actions (they never change, so this never causes re-renders). */
export function useActions() {
  return useHabitStoreApi().getState();
}
