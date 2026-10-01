import { useState, type CSSProperties } from 'react';
import type { DayKey, HabitRecord } from '../core/index.ts';
import { haptic } from '../feedback/haptics.ts';
import { useActions, useHabitStore } from '../store/context.tsx';
import { habitColor, sizes } from '../theme/index.ts';
import styles from './CompleteButton.module.css';

type Props = {
  habit: HabitRecord;
  count: number;
  done: boolean;
  /** Which day to change; defaults to today. */
  day?: DayKey;
};

// Drawing sizes come from the tokens, so the SVG matches the CSS.
const SIZE = sizes.completeButton;
const STROKE = sizes.completeRing;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * The big round complete button.
 * - Check habits: tap to complete. It presses in, fills with the habit's
 *   colour from the centre, draws a tick and springs back.
 * - Count habits: each tap adds one; the ring fills towards the target and
 *   the button fills when it's reached.
 */
export function CompleteButton({ habit, count, done, day }: Props) {
  const { toggleComplete, incrementCount } = useActions();
  const hapticsOn = useHabitStore((s) => s.settings.hapticsEnabled);
  const [pop, setPop] = useState(false);
  const isCount = habit.type === 'count';
  const target = Math.max(1, habit.targetCount);
  const progress = Math.min(1, count / target);

  function onClick() {
    const willComplete = isCount ? count + 1 >= target && !done : !done;
    haptic(willComplete ? 'complete' : 'tap', hapticsOn);
    if (willComplete) setPop(true);
    void (isCount ? incrementCount(habit.id, 1, day) : toggleComplete(habit.id, day));
  }

  const label = isCount
    ? `One more ${habit.unit ?? ''}`.trim()
    : `${habit.name}: ${done ? 'done' : 'not done'}`;

  return (
    <button
      className={styles.button}
      style={{ '--habit': habitColor(habit.colorKey) } as CSSProperties}
      data-done={done}
      data-pop={pop}
      aria-pressed={isCount ? undefined : done}
      aria-label={label}
      onClick={onClick}
      onAnimationEnd={() => setPop(false)}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle className={styles.track} cx={SIZE / 2} cy={SIZE / 2} r={R} />
        {isCount && (
          <circle
            className={styles.progress}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        )}
        <circle className={styles.fill} cx={SIZE / 2} cy={SIZE / 2} r={R} />
        {(!isCount || done) && (
          <path
            className={styles.tick}
            d={`M${SIZE * 0.31} ${SIZE * 0.52}l${SIZE * 0.13} ${SIZE * 0.13} ${SIZE * 0.25}-${SIZE * 0.26}`}
            pathLength={1}
          />
        )}
      </svg>
      {isCount && !done && <span className={styles.count}>{count}</span>}
    </button>
  );
}
