import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import ui from './ui.module.css';
import styles from './UpdateBanner.module.css';

const HOUR = 60 * 60 * 1000;

/**
 * Registers the service worker, offers "A new version is ready" when an
 * update has downloaded, and opens a habit when its notification is tapped.
 */
export function UpdateBanner() {
  const navigate = useNavigate();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Look for a new version every hour while the app stays open.
      if (registration) setInterval(() => void registration.update(), HOUR);
    },
  });

  // The service worker asks us to open a habit (a reminder notification was tapped).
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'open-habit') {
        navigate(event.data.habitId ? `/habit/${event.data.habitId}` : '/');
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate]);

  // "Ready to work offline" is good news, but it needs no action: show it briefly.
  useEffect(() => {
    if (!offlineReady) return;
    const t = window.setTimeout(() => setOfflineReady(false), 4000);
    return () => window.clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (needRefresh) {
    return (
      <div className={styles.banner} role="status" data-testid="update-banner">
        <span>A new version of Streakly is ready.</span>
        <div className={ui.row}>
          <button className={ui.button} onClick={() => setNeedRefresh(false)}>
            Later
          </button>
          <button className={ui.primary} onClick={() => void updateServiceWorker(true)}>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className={styles.banner} role="status" data-testid="offline-ready">
        <span>Streakly now works offline.</span>
      </div>
    );
  }

  return null;
}
