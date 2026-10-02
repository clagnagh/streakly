import { useActions, useHabitStore } from '../store/context.tsx';
import { installOffer, looksLikeIos } from '../pwa/installRules.ts';
import { useInstallPrompt } from '../pwa/install.ts';
import ui from './ui.module.css';
import styles from './InstallCard.module.css';

/** iOS's Share icon (a box with an arrow), so the steps match what people see. */
const ShareGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);

/**
 * "Install Streakly": the browser's install button where there is one, or
 * Add to Home Screen steps on iPhone. Only after a first completed habit.
 */
export function InstallCard() {
  const { canPrompt, installed, install } = useInstallPrompt();
  const today = useHabitStore((s) => s.today);
  const dismissedDay = useHabitStore((s) => s.settings.installDismissedDay);
  const hasCompleted = useHabitStore((s) =>
    Object.values(s.histories).some((h) => h.completions.length > 0),
  );
  const { setSetting } = useActions();

  const offer = installOffer({
    installed,
    hasCompleted,
    canPrompt,
    isIos: looksLikeIos(navigator.userAgent, navigator.maxTouchPoints),
    dismissedDay,
    today,
  });
  if (!offer) return null;

  const notNow = () => void setSetting('installDismissedDay', today);

  return (
    <section className={styles.card} aria-labelledby="install-title" data-testid="install-card">
      <h2 id="install-title" className={ui.h2}>
        Keep Streakly on your home screen
      </h2>
      {offer === 'prompt' ? (
        <p className={ui.muted}>It opens like an app, full screen, and works without internet.</p>
      ) : (
        <ol className={styles.steps}>
          <li>
            Tap <strong>Share</strong> <ShareGlyph /> in Safari's toolbar
          </li>
          <li>
            Choose <strong>Add to Home Screen</strong>
          </li>
          <li>
            Tap <strong>Add</strong>
          </li>
        </ol>
      )}
      <div className={ui.row}>
        {offer === 'prompt' && (
          <button className={ui.primary} onClick={() => void install()}>
            Install
          </button>
        )}
        <button className={ui.button} onClick={notNow}>
          {offer === 'prompt' ? 'Not now' : 'Got it'}
        </button>
      </div>
    </section>
  );
}
