import type { ReactNode } from 'react';
import { SproutIllustration } from './Icons.tsx';
import styles from './EmptyState.module.css';

/** A friendly, calm message for when there's nothing to show yet. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <SproutIllustration />
      <h2 className={styles.title}>{title}</h2>
      {children && <p className={styles.text}>{children}</p>}
      {action}
    </div>
  );
}
