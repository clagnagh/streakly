import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { HabitRecord, Weekday } from '../core/index.ts';
import type { HabitInput } from '../db/habitsRepo.ts';
import { weekdaysInOrder, weekdayShort, displayName } from '../format.ts';
import { habitColorKeys, vars } from '../theme/index.ts';
import { useActions, useHabitStore } from '../store/context.tsx';
import { Page } from '../components/Page.tsx';
import ui from '../components/ui.module.css';
import styles from './HabitEdit.module.css';

const EMOJI_IDEAS = ['🧘', '💧', '📚', '🏃', '🤸', '🥗', '😴', '✍️', '🎸', '🌱'];
const NAME_MAX = 40;

type Form = {
  name: string;
  emoji: string;
  colorKey: string;
  type: 'check' | 'count';
  target: string;
  unit: string;
  scheduleKind: 'daily' | 'weekdays' | 'timesPerWeek';
  days: Weekday[];
  times: string;
  reminderTime: string;
};

function formFrom(habit?: HabitRecord): Form {
  const s = habit?.schedule;
  return {
    name: habit?.name ?? '',
    emoji: habit?.emoji ?? '',
    colorKey: habit?.colorKey ?? 'teal',
    type: habit?.type ?? 'check',
    target: String(habit?.type === 'count' ? habit.targetCount : 8),
    unit: habit?.unit ?? '',
    scheduleKind: s?.kind ?? 'daily',
    days: s?.kind === 'weekdays' ? [...s.days] : [1, 2, 3, 4, 5],
    times: String(s?.kind === 'timesPerWeek' ? s.times : 3),
    reminderTime: habit?.reminderTime ?? '',
  };
}

type Errors = Partial<Record<'name' | 'target' | 'days' | 'times', string>>;

function validate(f: Form): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = 'Give your habit a name.';
  const target = Number(f.target);
  if (f.type === 'count' && !(Number.isInteger(target) && target >= 1 && target <= 99))
    e.target = 'Choose a whole number from 1 to 99.';
  if (f.scheduleKind === 'weekdays' && f.days.length === 0) e.days = 'Pick at least one day.';
  const times = Number(f.times);
  if (f.scheduleKind === 'timesPerWeek' && !(Number.isInteger(times) && times >= 1 && times <= 6))
    e.times = 'Choose from 1 to 6 times a week.';
  return e;
}

function toInput(f: Form): HabitInput {
  return {
    name: f.name.trim(),
    emoji: f.emoji.trim() || null,
    colorKey: f.colorKey,
    type: f.type,
    targetCount: f.type === 'count' ? Number(f.target) : 1,
    unit: f.type === 'count' ? f.unit.trim() || null : null,
    schedule:
      f.scheduleKind === 'daily'
        ? { kind: 'daily' }
        : f.scheduleKind === 'weekdays'
          ? { kind: 'weekdays', days: f.days }
          : { kind: 'timesPerWeek', times: Number(f.times) },
    reminderTime: f.reminderTime || null,
  };
}

function HabitForm({ habit }: { habit?: HabitRecord }) {
  const navigate = useNavigate();
  const actions = useActions();
  const weekStartsOn = useHabitStore((s) => s.settings.weekStartsOn);
  const [form, setForm] = useState<Form>(() => formFrom(habit));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const update = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      if (habit) {
        await actions.updateHabit(habit.id, toInput(form));
        navigate(`/habit/${habit.id}`);
      } else {
        await actions.createHabit(toInput(form));
        navigate('/');
      }
    } catch {
      setErrors({ name: "We couldn't save this habit. Please try again." });
      setSaving(false);
    }
  }

  async function remove() {
    if (!habit) return;
    const ok = window.confirm(
      `Delete "${displayName(habit.name)}" and all its history? This can't be undone. (Archiving keeps the history.)`,
    );
    if (!ok) return;
    await actions.deleteHabit(habit.id);
    navigate('/habits');
  }

  async function archive() {
    if (!habit) return;
    await (habit.archivedDay ? actions.unarchiveHabit(habit.id) : actions.archiveHabit(habit.id));
    navigate('/habits');
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={ui.field}>
        <label className={ui.label} htmlFor="name">
          Name
        </label>
        <input
          id="name"
          className={ui.input}
          value={form.name}
          maxLength={NAME_MAX}
          placeholder="e.g. Meditate"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          onChange={(e) => update({ name: e.target.value })}
        />
        {errors.name && (
          <span id="name-error" className={ui.error}>
            {errors.name}
          </span>
        )}
      </div>

      <div className={ui.field}>
        <label className={ui.label} htmlFor="emoji">
          Emoji <span className={ui.muted}>(optional)</span>
        </label>
        <input
          id="emoji"
          className={`${ui.input} ${styles.emojiInput}`}
          value={form.emoji}
          maxLength={8}
          onChange={(e) => update({ emoji: e.target.value })}
        />
        <div className={ui.row}>
          {EMOJI_IDEAS.map((e) => (
            <button
              key={e}
              type="button"
              className={ui.toggle}
              aria-pressed={form.emoji === e}
              aria-label={`Use ${e}`}
              onClick={() => update({ emoji: e })}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <fieldset className={ui.field}>
        <legend className={ui.label}>Colour</legend>
        <div className={ui.row}>
          {habitColorKeys.map((key) => (
            <button
              key={key}
              type="button"
              className={styles.swatch}
              style={{ background: vars.habit[key] }}
              aria-pressed={form.colorKey === key}
              aria-label={key}
              onClick={() => update({ colorKey: key })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className={ui.field}>
        <legend className={ui.label}>Type</legend>
        <div className={ui.row}>
          <button
            type="button"
            className={ui.toggle}
            aria-pressed={form.type === 'check'}
            onClick={() => update({ type: 'check' })}
          >
            Done once a day
          </button>
          <button
            type="button"
            className={ui.toggle}
            aria-pressed={form.type === 'count'}
            onClick={() => update({ type: 'count' })}
          >
            Count up to a target
          </button>
        </div>
        {form.type === 'count' && (
          <div className={ui.row}>
            <label className={ui.muted} htmlFor="target">
              Target
            </label>
            <input
              id="target"
              className={`${ui.input} ${styles.number}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={form.target}
              aria-invalid={!!errors.target}
              onChange={(e) => update({ target: e.target.value })}
            />
            <label className={ui.muted} htmlFor="unit">
              Unit
            </label>
            <input
              id="unit"
              className={ui.input}
              value={form.unit}
              placeholder="glasses"
              maxLength={20}
              onChange={(e) => update({ unit: e.target.value })}
            />
          </div>
        )}
        {errors.target && <span className={ui.error}>{errors.target}</span>}
      </fieldset>

      <fieldset className={ui.field}>
        <legend className={ui.label}>How often</legend>
        <div className={ui.row}>
          {(
            [
              ['daily', 'Every day'],
              ['weekdays', 'Specific days'],
              ['timesPerWeek', 'Times a week'],
            ] as const
          ).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              className={ui.toggle}
              aria-pressed={form.scheduleKind === kind}
              onClick={() => update({ scheduleKind: kind })}
            >
              {label}
            </button>
          ))}
        </div>
        {form.scheduleKind === 'weekdays' && (
          <div className={ui.row} role="group" aria-label="Days">
            {weekdaysInOrder(weekStartsOn).map((d) => (
              <button
                key={d}
                type="button"
                className={ui.toggle}
                aria-pressed={form.days.includes(d)}
                onClick={() =>
                  update({
                    days: form.days.includes(d)
                      ? form.days.filter((x) => x !== d)
                      : [...form.days, d],
                  })
                }
              >
                {weekdayShort(d)}
              </button>
            ))}
          </div>
        )}
        {form.scheduleKind === 'timesPerWeek' && (
          <div className={ui.row}>
            <input
              id="times"
              className={`${ui.input} ${styles.number}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={6}
              value={form.times}
              aria-label="Times a week"
              aria-invalid={!!errors.times}
              onChange={(e) => update({ times: e.target.value })}
            />
            <span className={ui.muted}>times a week, any days</span>
          </div>
        )}
        {(errors.days || errors.times) && (
          <span className={ui.error}>{errors.days ?? errors.times}</span>
        )}
      </fieldset>

      <div className={ui.field}>
        <label className={ui.label} htmlFor="reminder">
          Reminder <span className={ui.muted}>(optional)</span>
        </label>
        <div className={ui.row}>
          <input
            id="reminder"
            className={ui.input}
            type="time"
            value={form.reminderTime}
            onChange={(e) => update({ reminderTime: e.target.value })}
          />
          {form.reminderTime && (
            <button
              type="button"
              className={ui.button}
              onClick={() => update({ reminderTime: '' })}
            >
              No reminder
            </button>
          )}
        </div>
        <span className={ui.muted}>Reminders arrive in a later update.</span>
      </div>

      <div className={ui.row}>
        <button type="submit" className={ui.primary} disabled={saving}>
          {habit ? 'Save changes' : 'Add habit'}
        </button>
        <Link to={habit ? `/habit/${habit.id}` : '/'} className={ui.button}>
          Cancel
        </Link>
      </div>

      {habit && (
        <div className={`${ui.row} ${styles.dangerZone}`}>
          <button type="button" className={ui.button} onClick={archive}>
            {habit.archivedDay ? 'Restore' : 'Archive'}
          </button>
          <button type="button" className={ui.danger} onClick={remove}>
            Delete
          </button>
        </div>
      )}
    </form>
  );
}

export function HabitEdit() {
  const { id } = useParams();
  const habit = useHabitStore((s) => s.habits.find((h) => h.id === id));
  if (id && !habit) {
    return (
      <Page title="Habit not found">
        <Link to="/habits">Back to your habits</Link>
      </Page>
    );
  }
  return (
    <Page title={habit ? 'Edit habit' : 'New habit'}>
      <HabitForm key={habit?.id ?? 'new'} habit={habit} />
    </Page>
  );
}
