import { EmptyCard, Page } from '../components/Page.tsx';

export function Today() {
  const date = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return (
    <Page title="Today" subtitle={date}>
      <EmptyCard>A calm place for your habits. They'll appear here soon.</EmptyCard>
    </Page>
  );
}
