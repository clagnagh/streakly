import { Outlet } from 'react-router';
import { TabBar } from './TabBar.tsx';
import styles from './AppLayout.module.css';

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
