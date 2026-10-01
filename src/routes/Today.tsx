import { useMemo } from 'react';
import { Link } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { EmptyState } from '../components/EmptyState.tsx';
import { HabitCard } from '../components/HabitCard.tsx';
import { PlusIcon } from '../components/Icons.tsx';
import { Page } from '../components/Page.tsx';
import { ProgressRing } from '../components/ProgressRing.tsx';
import { formatDay } from '../format.ts';
import { useHabitStore } from '../store/context.tsx';
import { activeHabits, dayProgress, todayItems } from '../store/selectors.ts';
import ui from '../components/ui.module.css';
import styles from './Today.module.css';

/** A calm line under the date, depending on how the day is going. */
function dayMessage(done: number, total: number) {
  if (total === 0) return '';
  if (done === total) return 'All done for today. Rest well.';
  if (done === 0) return 'A fresh day. Start with whichever feels easiest.';
  return `${total - done} to go. Nice and steady.`;
}

export function Today() {
  const { habits, histories, today, weekStartsOn } = useHabitStore(
    useShallow((s) => ({
      habits: s.habits,
      histories: s.histories,
      today: s.today,
      weekStartsOn: s.settings.weekStartsOn,
    })),
  );
  const items = useMemo(
    () => todayItems(habits, histories, today, weekStartsOn),
    [habits, histories, today, weekStartsOn],
  );
  const progress = dayProgress(items);
  const hasHabits = activeHabits(habits).length > 0;

  return (
    <Page
      title="Today"
      subtitle={formatDay(today)}
      aside={items.length > 0 && <ProgressRing done={progress.done} total={progress.total} />}
    >
      {items.length > 0 && (
        <p className={styles.message} data-testid="day-progress" aria-live="polite">
          <span className="sr-only">
            {progress.done} of {progress.total} done.{' '}
          </span>
          {dayMessage(progress.done, progress.total)}
        </p>
      )}

      {items.length > 0 ? (
        <ul className={styles.list}>
          {items.map((item) => (
            <HabitCard key={item.habit.id} item={item} />
          ))}
        </ul>
      ) : hasHabits ? (
        <EmptyState title="Nothing due today">
          Enjoy the rest. Your habits will be back tomorrow.
        </EmptyState>
      ) : (
        <EmptyState
          title="Start with one small habit"
          action={
            <Link to="/habit/new" className={ui.primary} viewTransition>
              <PlusIcon /> New habit
            </Link>
          }
        >
          Something you could do even on a busy day. You can always add more later.
        </EmptyState>
      )}

      {hasHabits && (
        <div className={ui.row}>
          <Link to="/habit/new" className={ui.button} viewTransition>
            <PlusIcon /> New habit
          </Link>
        </div>
      )}
    </Page>
  );
}
