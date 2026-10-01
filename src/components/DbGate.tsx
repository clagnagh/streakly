import type { ReactNode } from 'react';
import { useDatabase } from '../hooks/useDatabase.ts';
import { StoreProvider, useHabitStore } from '../store/context.tsx';
import { DbStatus } from './DbStatus.tsx';
import { Skeleton } from './Skeleton.tsx';
import { Toast } from './Toast.tsx';

function WhenLoaded({ children }: { children: ReactNode }) {
  const loaded = useHabitStore((s) => s.loaded);
  if (!loaded) return <Skeleton />;
  return (
    <>
      {children}
      <Toast />
    </>
  );
}

/**
 * Shows its children only once the database is open and the store has
 * loaded; otherwise a friendly status (opening, another tab, error).
 */
export function DbGate({ children }: { children: ReactNode }) {
  const state = useDatabase();
  if (state.status === 'idle' || state.status === 'opening') return <Skeleton />;
  if (state.status !== 'ready') return <DbStatus state={state} />;
  return (
    <StoreProvider repos={state.connection.repos}>
      <WhenLoaded>{children}</WhenLoaded>
    </StoreProvider>
  );
}
