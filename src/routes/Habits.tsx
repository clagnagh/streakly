import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Link } from 'react-router';
import { Page } from '../components/Page.tsx';
import type { HabitRecord } from '../core/index.ts';
import { scheduleLabel, displayName } from '../format.ts';
import { useActions, useHabitStore } from '../store/context.tsx';
import { activeHabits, archivedHabits } from '../store/selectors.ts';
import { habitColor } from '../theme/index.ts';
import { ChevronDownIcon, ChevronUpIcon, GripIcon, PlusIcon } from '../components/Icons.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import ui from '../components/ui.module.css';
import styles from './Habits.module.css';

/**
 * Drag-to-reorder with pointer events, so it works with a mouse, a finger or
 * a pen. While dragging we keep a local order; it's saved when you let go.
 */
function useDragOrder(ids: string[], save: (ids: string[]) => void) {
  const [drag, setDrag] = useState<{ id: string; order: string[] } | null>(null);
  const rows = useRef(new Map<string, HTMLElement>());

  function onPointerDown(e: PointerEvent, id: string) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id, order: ids });
  }

  function onPointerMove(e: PointerEvent) {
    if (!drag) return;
    // Which row is the pointer over now?
    const over = drag.order.find((other) => {
      const r = rows.current.get(other)?.getBoundingClientRect();
      return r && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (!over || over === drag.id) return;
    const next = drag.order.filter((x) => x !== drag.id);
    next.splice(drag.order.indexOf(over), 0, drag.id);
    setDrag({ ...drag, order: next });
  }

  function onPointerUp() {
    if (drag && drag.order.join() !== ids.join()) save(drag.order);
    setDrag(null);
  }

  const register = (id: string) => (el: HTMLElement | null) => {
    if (el) rows.current.set(id, el);
    else rows.current.delete(id);
  };

  return {
    order: drag?.order ?? ids,
    draggingId: drag?.id ?? null,
    register,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}

function move(ids: string[], index: number, by: number): string[] {
  const next = [...ids];
  const [item] = next.splice(index, 1);
  next.splice(index + by, 0, item!);
  return next;
}

export function Habits() {
  const habits = useHabitStore((s) => s.habits);
  const weekStartsOn = useHabitStore((s) => s.settings.weekStartsOn);
  const { reorderHabits, archiveHabit, unarchiveHabit } = useActions();
  const active = activeHabits(habits);
  const archived = archivedHabits(habits);
  const byId = new Map<string, HabitRecord>(habits.map((h) => [h.id, h]));
  const ids = active.map((h) => h.id);
  const drag = useDragOrder(ids, (next) => void reorderHabits(next));

  return (
    <Page title="Habits">
      {active.length === 0 ? (
        <EmptyState title="No habits yet">Add one to get started. Small is perfect.</EmptyState>
      ) : (
        <ol className={styles.list} aria-label="Your habits, in order">
          {drag.order.map((id, index) => {
            const h = byId.get(id)!;
            return (
              <li
                key={id}
                ref={drag.register(id)}
                className={styles.row}
                data-dragging={drag.draggingId === id}
                data-testid="habit-row"
              >
                <button
                  className={styles.handle}
                  aria-label={`Drag to reorder ${displayName(h.name)}`}
                  onPointerDown={(e) => drag.onPointerDown(e, id)}
                  onPointerMove={drag.onPointerMove}
                  onPointerUp={drag.onPointerUp}
                  onPointerCancel={drag.onPointerUp}
                >
                  <GripIcon />
                </button>
                <Link to={`/habit/${id}`} className={styles.name} viewTransition>
                  <span
                    className={styles.badge}
                    style={{ '--habit': habitColor(h.colorKey) } as CSSProperties}
                    aria-hidden="true"
                  >
                    {h.emoji || h.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className={styles.text}>
                    <span className={styles.title}>{displayName(h.name)}</span>
                    <span className={ui.muted}>{scheduleLabel(h.schedule, weekStartsOn)}</span>
                  </span>
                </Link>
                {/* Keyboard reordering: hidden until a keyboard focuses this row (touch uses the handle). */}
                <span className={styles.arrows}>
                  <button
                    className={ui.iconButton}
                    aria-label={`Move ${displayName(h.name)} up`}
                    disabled={index === 0}
                    onClick={() => void reorderHabits(move(ids, index, -1))}
                  >
                    <ChevronUpIcon />
                  </button>
                  <button
                    className={ui.iconButton}
                    aria-label={`Move ${displayName(h.name)} down`}
                    disabled={index === ids.length - 1}
                    onClick={() => void reorderHabits(move(ids, index, 1))}
                  >
                    <ChevronDownIcon />
                  </button>
                </span>
                <button className={ui.button} onClick={() => void archiveHabit(id)}>
                  Archive
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <div className={ui.row}>
        <Link to="/habit/new" className={ui.primary} viewTransition>
          <PlusIcon /> New habit
        </Link>
      </div>

      {archived.length > 0 && (
        <section className={ui.stack}>
          <h2 className={ui.h2}>Archived</h2>
          <p className={ui.muted}>Resting habits keep all their history.</p>
          <ul className={styles.list}>
            {archived.map((h) => (
              <li key={h.id} className={styles.row} data-testid="archived-row">
                <Link to={`/habit/${h.id}`} className={styles.name}>
                  <span
                    className={styles.badge}
                    style={{ '--habit': habitColor(h.colorKey) } as CSSProperties}
                    aria-hidden="true"
                  >
                    {h.emoji || h.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className={styles.title}>{displayName(h.name)}</span>
                </Link>
                <button className={ui.button} onClick={() => void unarchiveHabit(h.id)}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
