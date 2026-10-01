import { EmptyCard, Page, Section } from '../components/Page.tsx';
import { StorageNote } from '../components/StorageNote.tsx';

export function Settings() {
  return (
    <Page title="Settings">
      <Section title="Storage">
        <StorageNote />
      </Section>
      <EmptyCard>Themes, reminders and backups will live here.</EmptyCard>
    </Page>
  );
}
