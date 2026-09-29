import { Link } from 'react-router';
import { EmptyCard, Page } from '../components/Page.tsx';
import styles from '../components/AppLayout.module.css';

export function NotFound() {
  return (
    <main className={styles.main}>
      <Page title="Nothing here">
        <EmptyCard>
          This page doesn't exist. <Link to="/">Back to Today</Link>
        </EmptyCard>
      </Page>
    </main>
  );
}
