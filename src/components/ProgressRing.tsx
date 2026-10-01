import { sizes } from '../theme/index.ts';
import styles from './ProgressRing.module.css';

const SIZE = sizes.ring;
const STROKE = sizes.ringStroke;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** The day's progress as a ring, with "3/5" in the middle. */
export function ProgressRing({ done, total }: { done: number; total: number }) {
  const share = total === 0 ? 0 : done / total;
  return (
    <div
      className={styles.ring}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label={`${done} of ${total} done today`}
      data-complete={total > 0 && done === total}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle className={styles.track} cx={SIZE / 2} cy={SIZE / 2} r={R} />
        <circle
          className={styles.value}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - share)}
        />
      </svg>
      <span className={styles.label}>
        <span>
          <strong>{done}</strong>/{total}
        </span>
      </span>
    </div>
  );
}
