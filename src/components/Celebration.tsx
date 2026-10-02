import { displayName } from '../format.ts';
import { useEffect, type CSSProperties } from 'react';
import { haptic } from '../feedback/haptics.ts';
import { useActions, useHabitStore } from '../store/context.tsx';
import { durations, habitColor } from '../theme/index.ts';
import styles from './Celebration.module.css';

const DOTS = 14;

/** Warm words for each milestone. Never pressure, just recognition. */
export function celebrationText(name: string, milestone: number, unit: 'days' | 'weeks') {
  if (unit === 'weeks') return `${milestone} weeks of ${name} in a row. Lovely and steady.`;
  if (milestone >= 365) return `A whole year of ${name}. Thank you for showing up.`;
  if (milestone >= 100) return `100 days of ${name}. Quietly remarkable.`;
  if (milestone >= 30) return `30 days of ${name}. It's part of your days now.`;
  return `A whole week of ${name}. That's real consistency.`;
}

/** A short burst of dots and a kind message when a streak reaches a milestone. */
export function Celebration() {
  const celebration = useHabitStore((s) => s.celebration);
  const habit = useHabitStore((s) => s.habits.find((h) => h.id === s.celebration?.habitId));
  const hapticsOn = useHabitStore((s) => s.settings.hapticsEnabled);
  const { dismissCelebration } = useActions();

  useEffect(() => {
    if (!celebration) return;
    haptic('milestone', hapticsOn);
    const timer = window.setTimeout(dismissCelebration, durations.celebrate);
    return () => window.clearTimeout(timer);
  }, [celebration, hapticsOn, dismissCelebration]);

  if (!celebration || !habit) return null;

  return (
    <div
      className={styles.overlay}
      style={{ '--habit': habitColor(habit.colorKey) } as CSSProperties}
      onClick={dismissCelebration}
    >
      <div className={styles.burst} aria-hidden="true">
        {Array.from({ length: DOTS }, (_, i) => (
          <span key={i} style={{ '--angle': `${(360 / DOTS) * i}deg` } as CSSProperties} />
        ))}
      </div>
      <div className={styles.card} role="status" aria-live="polite">
        <span className={styles.number}>{celebration.milestone}</span>
        <p>{celebrationText(displayName(habit.name), celebration.milestone, celebration.unit)}</p>
      </div>
    </div>
  );
}
