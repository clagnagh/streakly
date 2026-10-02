import { Segmented, Switch } from '../components/Controls.tsx';
import { Page, Section } from '../components/Page.tsx';
import { StorageNote } from '../components/StorageNote.tsx';
import type { ThemeChoice } from '../db/settingsRepo.ts';
import { useActions, useHabitStore } from '../store/context.tsx';
import ui from '../components/ui.module.css';
import { useState } from 'react';
import {
  askForNotifications,
  notificationState,
  type NotificationState,
} from '../pwa/notifications.ts';

const notificationText: Record<NotificationState, string> = {
  granted: 'Notifications are on. They arrive while Streakly is open in the background.',
  denied:
    "Notifications are blocked for Streakly. To allow them, open your browser's settings for this site.",
  default: 'Streakly can also send a notification when it is open in the background.',
  unsupported:
    "This browser can't show notifications from Streakly. On iPhone, add Streakly to your Home Screen first.",
};

function NotificationLine() {
  const [state, setState] = useState<NotificationState>(notificationState);
  return (
    <div className={ui.stack}>
      <p className={ui.muted} data-testid="notification-state" data-state={state}>
        {notificationText[state]}
      </p>
      {state === 'default' && (
        <div className={ui.row}>
          <button className={ui.button} onClick={() => void askForNotifications().then(setState)}>
            Allow notifications
          </button>
        </div>
      )}
    </div>
  );
}

const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const satisfies readonly { value: ThemeChoice; label: string }[];

export function Settings() {
  const theme = useHabitStore((s) => s.settings.theme);
  const haptics = useHabitStore((s) => s.settings.hapticsEnabled);
  const reminders = useHabitStore((s) => s.settings.remindersEnabled);
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

      <Section title="Reminders">
        <Switch
          label="Highlight habits after their reminder time"
          checked={reminders}
          onChange={(v) => void setSetting('remindersEnabled', v)}
        />
        {reminders && <NotificationLine />}
        <p className={ui.muted}>
          Reminders work while Streakly is open. Web apps can't send notifications when they're
          fully closed, which is how Streakly stays free of accounts and servers.
        </p>
      </Section>

      <Section title="Storage">
        <StorageNote />
      </Section>
    </Page>
  );
}
