import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { HabitControl } from '../components/HabitControl.tsx';
import { Page } from '../components/Page.tsx';
import {
  formatDay,
  scheduleLabel,
  streakLength,
  weekdayShort,
  weekdaysInOrder,
  displayName,
} from '../format.ts';
import { weekdayOf } from '../core/index.ts';
import type { CSSProperties } from 'react';
import { useHabitStore } from '../store/context.tsx';
import { habitDetail, type DayCell } from '../store/selectors.ts';
import { habitColor } from '../theme/index.ts';
import ui from '../components/ui.module.css';
import styles from './HabitDetail.module.css';

function cellLabel(cell: DayCell) {
  const state = cell.done
    ? 'done'
    : cell.count > 0
      ? `${cell.count} so far`
      : cell.frozen
        ? 'frozen'
        : cell.due
          ? 'not done'
          : 'not due';
  return `${formatDay(cell.day, { weekday: 'short', day: 'numeric', month: 'short' })}: ${state}`;
}

export function HabitDetail() {
  const { id } = useParams();
  const { habit, history, today, weekStartsOn } = useHabitStore(
    useShallow((s) => ({
      habit: s.habits.find((h) => h.id === id),
      history: id ? s.histories[id] : undefined,
      today: s.today,
      weekStartsOn: s.settings.weekStartsOn,
    })),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const detail = useMemo(
    () => habit && habitDetail(habit, history, today, weekStartsOn),
    [habit, history, today, weekStartsOn],
  );

  if (!habit || !detail) {
    return (
      <Page title="Habit not found">
        <Link to="/habits">Back to your habits</Link>
      </Page>
    );
  }

  const selectedDay = selected ?? today;
  // Blank cells before the first day, so each column is one weekday.
  const lead = (weekdayOf(detail.cells[0]!.day) - weekStartsOn + 7) % 7;
  const selectedCell = detail.cells.find((c) => c.day === selectedDay) ?? detail.cells.at(-1)!;
  const { current, best } = detail.streaks;

  return (
    <Page
      title={`${habit.emoji ? `${habit.emoji} ` : ''}${displayName(habit.name)}`}
      subtitle={`${scheduleLabel(habit.schedule, weekStartsOn)}${habit.archivedDay ? ' · Archived' : ''}`}
    >
      <div className={styles.stats}>
        <div className={ui.card}>
          <span className={ui.muted}>Current streak</span>
          <strong data-testid="current-streak">{streakLength(current)}</strong>
        </div>
        <div className={ui.card}>
          <span className={ui.muted}>Best streak</span>
          <strong data-testid="best-streak">{streakLength(best)}</strong>
        </div>
      </div>

      <section className={ui.stack}>
        <h2 className={ui.h2}>Last 30 days</h2>
        <p className={ui.muted}>Tap a day to change it.</p>
        <div
          className={styles.grid}
          role="group"
          aria-label="Last 30 days"
          style={{ '--habit': habitColor(habit.colorKey) } as CSSProperties}
        >
          {weekdaysInOrder(weekStartsOn).map((d) => (
            <span key={d} className={styles.weekday} aria-hidden="true">
              {weekdayShort(d).slice(0, 1)}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`lead-${i}`} aria-hidden="true" />
          ))}
          {detail.cells.map((cell) => (
            <button
              key={cell.day}
              className={styles.cell}
              data-state={
                cell.done ? 'done' : cell.count > 0 ? 'partial' : cell.due ? 'open' : 'off'
              }
              aria-pressed={cell.day === selectedCell.day}
              aria-label={cellLabel(cell)}
              style={
                cell.done || cell.count > 0 ? { background: habitColor(habit.colorKey) } : undefined
              }
              onClick={() => setSelected(cell.day)}
            >
              {Number(cell.day.slice(8))}
              {cell.frozen && !cell.done && <span aria-hidden="true">❄</span>}
            </button>
          ))}
        </div>

        <div className={ui.card} data-testid="selected-day">
          <strong>{selectedCell.day === today ? 'Today' : formatDay(selectedCell.day)}</strong>
          <HabitControl
            habit={habit}
            count={selectedCell.count}
            done={selectedCell.done}
            day={selectedCell.day}
          />
        </div>
      </section>

      <div className={ui.row}>
        <Link to={`/habit/${habit.id}/edit`} className={ui.button}>
          Edit habit
        </Link>
      </div>
    </Page>
  );
}
