import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useActions } from '../store/context.tsx';
import { DbGate } from './DbGate.tsx';
import { TabBar } from './TabBar.tsx';
import styles from './AppLayout.module.css';

const MINUTE = 60_000;

/**
 * Moves "today" on when a new day starts: when the tab comes back into view,
 * and once a minute while it's open (for a tab left open overnight).
 */
function DayRollover() {
  const { refreshToday } = useActions();
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible') refreshToday();
    };
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    const timer = window.setInterval(check, MINUTE);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
      window.clearInterval(timer);
    };
  }, [refreshToday]);
  return null;
}

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <DbGate>
          <DayRollover />
          <Outlet />
        </DbGate>
      </main>
      <TabBar />
    </div>
  );
}
