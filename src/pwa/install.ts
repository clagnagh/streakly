// Catches the browser's "you can install this" moment (Chrome, Edge,
// Android). The event fires early, so main.tsx imports this file before React
// starts; the install card can then show the browser's own install dialog.

import { useSyncExternalStore } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // we'll show our own, calmer card instead of the browser's mini-bar
  deferred = e as BeforeInstallPromptEvent;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  installedNow = true;
  notify();
});

/** True when running as an installed app (from the home screen or app list). */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useInstallPrompt() {
  const canPrompt = useSyncExternalStore(subscribe, () => deferred !== null);
  const installed = useSyncExternalStore(subscribe, () => installedNow || isStandalone());
  return {
    canPrompt,
    installed,
    /** Shows the browser's install dialog. Resolves to true if they installed. */
    async install(): Promise<boolean> {
      if (!deferred) return false;
      const event = deferred;
      deferred = null;
      notify();
      await event.prompt();
      return (await event.userChoice).outcome === 'accepted';
    },
  };
}
