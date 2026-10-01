import type { ReactNode } from 'react';
import styles from './Page.module.css';

type Props = {
  title: string;
  subtitle?: string;
  /** Something to show at the right of the title (e.g. the progress ring). */
  aside?: ReactNode;
  children?: ReactNode;
};

/** Page title plus content, the same on every tab. */
export function Page({ title, subtitle, aside, children }: Props) {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headings}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
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
