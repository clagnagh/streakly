import { displayName } from '../format.ts';
import type { DayKey, HabitRecord } from '../core/index.ts';
import { useActions } from '../store/context.tsx';
import ui from './ui.module.css';
import styles from './HabitControl.module.css';

type Props = {
  habit: HabitRecord;
  count: number;
  done: boolean;
  /** Which day to change; defaults to today. */
  day?: DayKey;
};

/** The complete control: a done toggle for check habits, a − / + stepper for count habits. */
export function HabitControl({ habit, count, done, day }: Props) {
  const { toggleComplete, incrementCount } = useActions();

  if (habit.type === 'check') {
    return (
      <button
        className={ui.toggle}
        aria-pressed={done}
        aria-label={`${displayName(habit.name)}: ${done ? 'done' : 'not done'}`}
        onClick={() => void toggleComplete(habit.id, day)}
      >
        {done ? '✓ Done' : 'Mark done'}
      </button>
    );
  }

  return (
    <div className={styles.stepper} role="group" aria-label={`${displayName(habit.name)} count`}>
      <button
        className={ui.iconButton}
        aria-label={`One less ${habit.unit ?? ''}`.trim()}
        disabled={count === 0}
        onClick={() => void incrementCount(habit.id, -1, day)}
      >
        −
      </button>
      <span className={styles.count} data-done={done} aria-live="polite">
        {count} / {habit.targetCount}
        {habit.unit && <span className={ui.muted}> {habit.unit}</span>}
      </span>
      <button
        className={ui.iconButton}
        aria-label={`One more ${habit.unit ?? ''}`.trim()}
        onClick={() => void incrementCount(habit.id, 1, day)}
      >
        +
      </button>
    </div>
  );
}
