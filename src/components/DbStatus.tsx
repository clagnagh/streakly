import { takeOverFromOtherTab, type DbState } from '../db/connection.ts';
import ui from './ui.module.css';

/** What to show while the database isn't ready: opening, another tab, or an error. */
export function DbStatus({ state }: { state: Exclude<DbState, { status: 'ready' }> }) {
  if (state.status === 'idle' || state.status === 'opening') {
    return <p className={ui.muted}>Opening your habits…</p>;
  }
  if (state.status === 'error') {
    return (
      <section className={ui.card} role="alert">
        <h2 className={ui.h2}>We couldn't open your habits</h2>
        <p>{state.error.friendly}</p>
        <p className={ui.muted}>Details: {state.error.message}</p>
      </section>
    );
  }
  return (
    <section className={ui.card} role="status">
      <h2 className={ui.h2}>
        {state.status === 'otherTab'
          ? 'Streakly is open in another tab'
          : 'Streakly moved to another tab'}
      </h2>
      <p className={ui.muted}>To keep your habits safe, Streakly works in one tab at a time.</p>
      <div className={ui.row}>
        <button className={ui.primary} onClick={takeOverFromOtherTab}>
          Use it here
        </button>
      </div>
    </section>
  );
}
