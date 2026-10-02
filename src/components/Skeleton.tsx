import styles from './Skeleton.module.css';

/** Soft placeholder cards while habits load. */
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className={styles.list} aria-busy="true" aria-label="Loading your habits">
      <div className={`${styles.block} ${styles.heading}`} />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.card}>
          <div className={`${styles.block} ${styles.badge}`} />
          <div className={styles.lines}>
            <div className={`${styles.block} ${styles.line}`} />
            <div className={`${styles.block} ${styles.short}`} />
          </div>
          <div className={`${styles.block} ${styles.circle}`} />
        </div>
      ))}
    </div>
  );
}
