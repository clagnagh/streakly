import { useActions, useHabitStore } from '../store/context.tsx';
import styles from './Toast.module.css';

/** A message above the tab bar when a save fails. */
export function Toast() {
  const error = useHabitStore((s) => s.error);
  const { dismissError } = useActions();
  if (!error) return null;
  return (
    <div className={styles.toast} role="alert">
      <span>{error}</span>
      <button className={styles.close} onClick={dismissError} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
