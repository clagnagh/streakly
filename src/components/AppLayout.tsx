import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useLayoutAttribute } from '../feedback/layout.ts';
import { applyTheme } from '../feedback/theme.ts';
import { useActions, useHabitStore } from '../store/context.tsx';
import { Celebration } from './Celebration.tsx';
import { DbGate } from './DbGate.tsx';
import { ReminderWatcher } from './ReminderWatcher.tsx';
import { TabBar } from './TabBar.tsx';
import { UpdateBanner } from './UpdateBanner.tsx';
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

/** Keeps the page's theme in step with the saved setting. */
function ThemeSync() {
  const theme = useHabitStore((s) => s.settings.theme);
  useEffect(() => applyTheme(theme), [theme]);
  return null;
}

export function AppLayout() {
  useLayoutAttribute();
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <DbGate>
          <DayRollover />
          <ThemeSync />
          <ReminderWatcher />
          <Celebration />
          <Outlet />
        </DbGate>
      </main>
      <TabBar />
      <UpdateBanner />
    </div>
  );
}
