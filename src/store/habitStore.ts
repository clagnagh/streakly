// The app's state, in one Zustand store.
//
// Pages read from it and call its actions; they never touch the database or
// work out habit rules themselves. Each action:
//   1. updates the state straight away (so taps feel instant),
//   2. saves through a repository,
//   3. if saving fails, puts the old state back and sets a friendly `error`.
// That's an "optimistic update": we assume the save will work, because it
// almost always does, and undo if it doesn't.

import { createStore } from 'zustand/vanilla';
import {
  canEditDay,
  countOn,
  emptyHistory,
  isComplete,
  withCount,
  type DayKey,
  type HabitHistory,
  type HabitRecord,
} from '../core/index.ts';
import { DbError } from '../db/client.ts';
import type { HabitInput } from '../db/habitsRepo.ts';
import type { Repos } from '../db/repos.ts';
import { settingDefaults, type Settings } from '../db/settingsRepo.ts';
import { todayFrom, type Clock } from './clock.ts';

export type HabitState = {
  loaded: boolean;
  today: DayKey;
  settings: Settings;
  /** Every habit, archived ones included, in the user's order. */
  habits: HabitRecord[];
  histories: Record<string, HabitHistory>;
  /** A friendly message after a failed save, until dismissed. */
  error: string | null;
};

export type HabitActions = {
  load(): Promise<void>;
  /** Re-reads the clock; moves `today` on if a new day has started. */
  refreshToday(): void;
  /** Check habits: done ↔ not done. Defaults to today. */
  toggleComplete(habitId: string, day?: DayKey): Promise<void>;
  /** Count habits: add (or with a negative number, take away). Defaults to today. */
  incrementCount(habitId: string, by: number, day?: DayKey): Promise<void>;
  setCompletionForDay(habitId: string, day: DayKey, count: number): Promise<void>;
  createHabit(input: HabitInput): Promise<HabitRecord>;
  updateHabit(id: string, input: HabitInput): Promise<void>;
  archiveHabit(id: string): Promise<void>;
  unarchiveHabit(id: string): Promise<void>;
  deleteHabit(id: string): Promise<void>;
  /** Saves a new order for the active habits: ids from first to last. */
  reorderHabits(ids: readonly string[]): Promise<void>;
  dismissError(): void;
};

export type HabitStore = HabitState & HabitActions;

const SAVE_FAILED = "We couldn't save that change. Please try again.";

function friendly(e: unknown): string {
  return e instanceof DbError ? e.friendly : SAVE_FAILED;
}

export function createHabitStore(repos: Repos, clock: Clock) {
  return createStore<HabitStore>()((set, get) => {
    /**
     * Applies `change` to the state now, runs `save`, and restores the
     * previous values of the changed keys if `save` fails.
     */
    async function optimistic(change: Partial<HabitState>, save: () => Promise<unknown>) {
      const before = get();
      const previous = Object.fromEntries(
        Object.keys(change).map((k) => [k, before[k as keyof HabitState]]),
      ) as Partial<HabitState>;
      set(change);
      try {
        await save();
      } catch (e) {
        set({ ...previous, error: friendly(e) });
      }
    }

    const historyOf = (id: string) => get().histories[id] ?? emptyHistory;
    const now = () => clock.now().toISOString();

    async function setCount(habitId: string, day: DayKey, count: number) {
      const { today, histories } = get();
      if (!canEditDay(day, today)) return; // no future days
      const next = Math.max(0, Math.round(count));
      await optimistic(
        { histories: { ...histories, [habitId]: withCount(historyOf(habitId), day, next) } },
        () => repos.completions.setCount(habitId, day, next, now()),
      );
    }

    function replaceHabit(id: string, patch: Partial<HabitRecord>) {
      return get().habits.map((h) => (h.id === id ? { ...h, ...patch } : h));
    }

    return {
      loaded: false,
      today: todayFrom(clock, settingDefaults.dayStartHour),
      settings: settingDefaults,
      habits: [],
      histories: {},
      error: null,

      async load() {
        const [settings, habits, histories] = await Promise.all([
          repos.settings.getAll(),
          repos.habits.list({ includeArchived: true }),
          repos.completions.allHistories(),
        ]);
        set({
          loaded: true,
          settings,
          habits,
          histories,
          today: todayFrom(clock, settings.dayStartHour),
        });
      },

      refreshToday() {
        const today = todayFrom(clock, get().settings.dayStartHour);
        if (today !== get().today) set({ today });
      },

      async toggleComplete(habitId, day = get().today) {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit) return;
        const done = isComplete(habit, countOn(historyOf(habitId), day));
        await setCount(habitId, day, done ? 0 : habit.targetCount);
      },

      async incrementCount(habitId, by, day = get().today) {
        await setCount(habitId, day, countOn(historyOf(habitId), day) + by);
      },

      setCompletionForDay: setCount,

      async createHabit(input) {
        const habit = await repos.habits.create(input, get().today, now());
        set({ habits: [...get().habits, habit] });
        return habit;
      },

      async updateHabit(id, input) {
        const existing = get().habits.find((h) => h.id === id);
        if (!existing) return;
        await repos.habits.update(id, input);
        const fresh = await repos.habits.get(id);
        if (fresh) set({ habits: replaceHabit(id, fresh) });
      },

      async archiveHabit(id) {
        const today = get().today;
        await optimistic({ habits: replaceHabit(id, { archivedDay: today }) }, () =>
          repos.habits.archive(id, today),
        );
      },

      async unarchiveHabit(id) {
        await optimistic({ habits: replaceHabit(id, { archivedDay: null }) }, () =>
          repos.habits.unarchive(id),
        );
      },

      async deleteHabit(id) {
        const { habits, histories } = get();
        const rest = { ...histories };
        delete rest[id];
        await optimistic({ habits: habits.filter((h) => h.id !== id), histories: rest }, () =>
          repos.habits.remove(id),
        );
      },

      async reorderHabits(ids) {
        const { habits } = get();
        // Active habits take the new order; archived ones keep their place after them.
        const byId = new Map(habits.map((h) => [h.id, h]));
        const moved = ids.map((id) => byId.get(id)).filter((h) => h !== undefined);
        const others = habits.filter((h) => !ids.includes(h.id));
        const ordered = [...moved, ...others].map((h, i) => ({ ...h, sortOrder: i }));
        await optimistic({ habits: ordered }, () => repos.habits.reorder(ordered.map((h) => h.id)));
      },

      dismissError() {
        set({ error: null });
      },
    };
  });
}

export type HabitStoreApi = ReturnType<typeof createHabitStore>;
