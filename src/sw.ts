/// <reference lib="webworker" />
// The service worker: a small script the browser keeps beside the app,
// even when no tab is open. Ours does three jobs:
//   1. Offline: keeps a copy of every app file (the "precache") and serves
//      it, so Streakly opens in airplane mode.
//   2. Updates: a new version waits until you tap "Refresh" (SKIP_WAITING).
//   3. Reminders: when you tap a reminder notification, it opens that habit.
//
// It's built separately from the app (vite-plugin-pwa, injectManifest) and has
// its own type settings (tsconfig.sw.json), because it runs in a different
// kind of JavaScript world: no window, no document.

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  // Filled in at build time with every file to keep offline.
  __WB_MANIFEST: (string | { url: string; revision: string | null })[];
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const habitId: string | undefined = event.notification.data?.habitId;
  const url = new URL(habitId ? `./#/habit/${habitId}` : './', self.registration.scope).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows[0];
      if (open) {
        await open.focus();
        open.postMessage({ type: 'open-habit', habitId });
      } else {
        await self.clients.openWindow(url);
      }
    })(),
  );
});
