import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { streakLabel, displayName } from '../format.ts';
import { haptic } from '../feedback/haptics.ts';
import { useActions, useHabitStore } from '../store/context.tsx';
import type { TodayItem } from '../store/selectors.ts';
import { habitColor } from '../theme/index.ts';
import { CompleteButton } from './CompleteButton.tsx';
import { MinusIcon } from './Icons.tsx';
import styles from './HabitCard.module.css';

/** One habit on Today: badge, name, progress notes and the complete button. */
export function HabitCard({ item }: { item: TodayItem }) {
  const { habit, week, streak, count, done } = item;
  const { incrementCount } = useActions();
  const hapticsOn = useHabitStore((s) => s.settings.hapticsEnabled);

  // "Settle" once, the moment it becomes done (not when the page first loads).
  const wasDone = useRef(done);
  const [settle, setSettle] = useState(false);
  useEffect(() => {
    if (done && !wasDone.current) setSettle(true);
    wasDone.current = done;
  }, [done]);

  const notes = [
    habit.type === 'count' &&
      `${count} / ${habit.targetCount}${habit.unit ? ` ${habit.unit}` : ''}`,
    week && `${week.done} of ${week.times} this week`,
    streakLabel(streak),
  ].filter(Boolean);

  return (
    <li
      className={styles.card}
      style={{ '--habit': habitColor(habit.colorKey) } as CSSProperties}
      data-done={done}
      data-settle={settle}
      onAnimationEnd={(e) => e.target === e.currentTarget && setSettle(false)}
      data-testid="today-row"
      data-habit={habit.name}
    >
      <Link to={`/habit/${habit.id}`} className={styles.main} viewTransition>
        <span className={styles.badge} aria-hidden="true">
          {habit.emoji || habit.name.slice(0, 1).toUpperCase()}
        </span>
        <span className={styles.text}>
          <span className={styles.name}>{displayName(habit.name)}</span>
          {notes.length > 0 && <span className={styles.meta}>{notes.join(' · ')}</span>}
        </span>
      </Link>
      {habit.type === 'count' && count > 0 && (
        <button
          className={styles.minus}
          aria-label={`One less ${habit.unit ?? ''}`.trim()}
          onClick={() => {
            haptic('tap', hapticsOn);
            void incrementCount(habit.id, -1);
          }}
        >
          <MinusIcon />
        </button>
      )}
      <CompleteButton habit={habit} count={count} done={done} />
    </li>
  );
}
