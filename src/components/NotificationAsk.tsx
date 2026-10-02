import styles from './NotificationAsk.module.css';
import ui from './ui.module.css';

/**
 * Explains notifications before the browser asks, so the question makes
 * sense. Shown once, the first time someone sets a reminder time.
 */
export function NotificationAsk({ onAllow, onSkip }: { onAllow: () => void; onSkip: () => void }) {
  return (
    <div className={styles.backdrop}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-title"
        aria-describedby="ask-text"
      >
        <h2 id="ask-title" className={ui.h2}>
          Want a gentle nudge?
        </h2>
        <p id="ask-text">
          When a reminder time passes, Streakly highlights the habit on Today. It can also send a
          notification if Streakly is open in the background. Your browser will ask if that's okay.
        </p>
        <p className={ui.muted}>
          Web apps can't send notifications when they're fully closed. That's how Streakly stays
          free of accounts and servers.
        </p>
        <div className={ui.row}>
          <button type="button" className={ui.primary} onClick={onAllow} autoFocus>
            Allow notifications
          </button>
          <button type="button" className={ui.button} onClick={onSkip}>
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
