import type { ReactNode } from 'react';
import styles from './Page.module.css';

type Props = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

/** Page title plus content, the same on every tab. */
export function Page({ title, subtitle, children }: Props) {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

/** A soft placeholder card, used until each page gets its real content. */
export function EmptyCard({ children }: { children: ReactNode }) {
  return <div className={styles.empty}>{children}</div>;
}

/** A titled card for grouping things on a page (e.g. a Settings section). */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}
