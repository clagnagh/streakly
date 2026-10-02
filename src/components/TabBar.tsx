import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { HabitsIcon, SettingsIcon, StatsIcon, TodayIcon } from './Icons.tsx';
import styles from './TabBar.module.css';

const tabs: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Today', icon: <TodayIcon /> },
  { to: '/habits', label: 'Habits', icon: <HabitsIcon /> },
  { to: '/stats', label: 'Stats', icon: <StatsIcon /> },
  { to: '/settings', label: 'Settings', icon: <SettingsIcon /> },
];

/** Bottom tab bar on phones; a sidebar on desktop (see TabBar.module.css). */
export function TabBar() {
  return (
    <nav className={styles.bar} aria-label="Main">
      <span className={styles.brand} aria-hidden="true">
        Streakly
      </span>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          viewTransition
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
        >
          <span className={styles.icon}>{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
