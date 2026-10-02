import { EmptyState } from '../components/EmptyState.tsx';
import { Page } from '../components/Page.tsx';

export function Stats() {
  return (
    <Page title="Stats">
      <EmptyState title="Your progress will grow here">
        A year at a glance, your best days and your longest streaks, one day at a time.
      </EmptyState>
    </Page>
  );
}
