import { NavLink } from 'react-router';
import styles from './TabBar.module.css';

// Placeholder tab bar. Icons and the desktop sidebar arrive in Milestone 4.
const tabs = [
  { to: '/', label: 'Today' },
  { to: '/habits', label: 'Habits' },
  { to: '/stats', label: 'Stats' },
  { to: '/settings', label: 'Settings' },
];

export function TabBar() {
  return (
    <nav className={styles.bar} aria-label="Main">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
