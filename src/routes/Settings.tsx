import { Segmented, Switch } from '../components/Controls.tsx';
import { Page, Section } from '../components/Page.tsx';
import { StorageNote } from '../components/StorageNote.tsx';
import type { ThemeChoice } from '../db/settingsRepo.ts';
import { useActions, useHabitStore } from '../store/context.tsx';
import ui from '../components/ui.module.css';

const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const satisfies readonly { value: ThemeChoice; label: string }[];

export function Settings() {
  const theme = useHabitStore((s) => s.settings.theme);
  const haptics = useHabitStore((s) => s.settings.hapticsEnabled);
  const { setSetting } = useActions();

  return (
    <Page title="Settings">
      <Section title="Appearance">
        <Segmented
          label="Theme"
          options={themeOptions}
          value={theme}
          onChange={(v) => void setSetting('theme', v)}
        />
        <p className={ui.muted}>System follows your device's light or dark mode.</p>
      </Section>

      <Section title="Feel">
        <Switch
          label="Vibration on tap"
          checked={haptics}
          onChange={(v) => void setSetting('hapticsEnabled', v)}
        />
        <p className={ui.muted}>
          Works on most Android phones. iPhones don't allow it for web apps.
        </p>
      </Section>

      <Section title="Storage">
        <StorageNote />
      </Section>
    </Page>
  );
}
