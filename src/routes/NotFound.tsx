import { Link } from 'react-router';
import { EmptyState } from '../components/EmptyState.tsx';
import { Page } from '../components/Page.tsx';
import styles from '../components/AppLayout.module.css';
import ui from '../components/ui.module.css';

export function NotFound() {
  return (
    <main className={styles.main}>
      <Page title="Nothing here">
        <EmptyState
          title="This page doesn't exist"
          action={
            <Link to="/" className={ui.primary}>
              Back to Today
            </Link>
          }
        />
      </Page>
    </main>
  );
}
