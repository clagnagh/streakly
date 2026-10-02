// Browser notifications for reminders. They only work while Streakly is open
// (in the background); a closed web app can't be woken without a push server.

export type NotificationState = 'granted' | 'denied' | 'default' | 'unsupported';

export function notificationState(): NotificationState {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  return Notification.permission;
}

export async function askForNotifications(): Promise<NotificationState> {
  if (notificationState() === 'unsupported') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationState();
  }
}

/**
 * Shows a reminder through the service worker (Android only allows it that
 * way). `tag` makes a repeat replace the old one instead of stacking up.
 */
export async function showReminder(habitId: string, title: string, body: string): Promise<void> {
  if (notificationState() !== 'granted') return;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      tag: `reminder-${habitId}`,
      icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
      data: { habitId },
    });
  } catch {
    // A missed nudge is fine; the highlight on Today still shows.
  }
}
