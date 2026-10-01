import { useMemo } from 'react';
import { Link } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { HabitControl } from '../components/HabitControl.tsx';
import { Page } from '../components/Page.tsx';
import { formatDay, streakLabel } from '../format.ts';
import { useHabitStore } from '../store/context.tsx';
import { activeHabits, dayProgress, todayItems, type TodayItem } from '../store/selectors.ts';
import ui from '../components/ui.module.css';
import styles from './Today.module.css';

function HabitRow({ item }: { item: TodayItem }) {
  const { habit, week, streak } = item;
  const notes = [week && `${week.done} of ${week.times} this week`, streakLabel(streak)].filter(
    Boolean,
  );
  return (
    <li className={styles.row} data-testid="today-row" data-habit={habit.name}>
      <Link to={`/habit/${habit.id}`} className={styles.name}>
        <span aria-hidden="true">{habit.emoji}</span>
        <span>
          <span className={styles.title}>{habit.name}</span>
          {notes.length > 0 && <span className={ui.muted}>{notes.join(' · ')}</span>}
        </span>
      </Link>
      <HabitControl habit={habit} count={item.count} done={item.done} />
    </li>
  );
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
    <Page title="Today" subtitle={formatDay(today)}>
      {items.length > 0 && (
        <div className={ui.stack}>
          <label className={ui.muted} htmlFor="day-progress" data-testid="day-progress">
            {progress.done} of {progress.total} done
          </label>
          <progress
            id="day-progress"
            className={styles.progress}
            max={progress.total}
            value={progress.done}
          />
        </div>
      )}

      {items.length > 0 ? (
        <ul className={styles.list}>
          {items.map((item) => (
            <HabitRow key={item.habit.id} item={item} />
          ))}
        </ul>
      ) : (
        <div className={ui.card}>
          {hasHabits ? (
            <p>Nothing due today. Enjoy the rest.</p>
          ) : (
            <p>Start with one small habit. Something you could do even on a busy day.</p>
          )}
        </div>
      )}

      <div className={ui.row}>
        <Link to="/habit/new" className={hasHabits ? ui.button : ui.primary}>
          New habit
        </Link>
      </div>
    </Page>
  );
}
