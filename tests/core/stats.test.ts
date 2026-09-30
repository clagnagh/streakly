import { describe, expect, it } from 'vitest';
import {
  completionRate,
  habitHeatmap,
  levelFor,
  overallHeatmap,
  totalCompletions,
  weekdayBreakdown,
} from '../../src/core/stats.ts';
import { TODAY, habit, history } from './builders.ts';

// Today is Wednesday 30 Sep 2026.
const lastTenDays = { start: '2026-09-21', end: TODAY };
const weekdays = habit({
  createdDay: '2026-09-21',
  schedule: { kind: 'weekdays', days: [1, 2, 3, 4, 5] },
});

describe('completion rate', () => {
  const daily = habit({ createdDay: '2026-09-21' });

  it("is done due days ÷ due days, and today doesn't count until it's done", () => {
    expect(completionRate(daily, history('2026-09-21', 'xx-xxx-xx-'), lastTenDays, TODAY)).toEqual({
      done: 7,
      due: 9,
      rate: 7 / 9,
    });
    expect(
      completionRate(daily, history('2026-09-21', 'xx-xxx-xxx'), lastTenDays, TODAY).rate,
    ).toBe(0.8);
  });

  it("frozen days don't count against you", () => {
    const r = completionRate(daily, history('2026-09-21', 'xx-xxxfxx-'), lastTenDays, TODAY);
    expect(r).toMatchObject({ done: 7, due: 8 });
  });

  it('only counts days the habit is due', () => {
    const r = completionRate(weekdays, history('2026-09-21', 'xxxx-.. xxx'), lastTenDays, TODAY);
    expect(r).toMatchObject({ done: 7, due: 8 });
  });

  it("starts at the habit's history start, including backfilled days", () => {
    const newer = habit({ createdDay: '2026-09-29' });
    const r = completionRate(newer, history('2026-09-25', 'x-xxxx'), lastTenDays, TODAY);
    expect(r).toMatchObject({ done: 5, due: 6 });
  });

  it('has no rate when nothing was due', () => {
    const r = completionRate(
      daily,
      history('2026-09-21', 'x'),
      { start: '2026-08-01', end: '2026-08-31' },
      TODAY,
    );
    expect(r).toEqual({ done: 0, due: 0, rate: null });
  });

  describe('"X times a week"', () => {
    const threeAWeek = habit({
      createdDay: '2026-09-07',
      schedule: { kind: 'timesPerWeek', times: 3 },
    });
    const sept = { start: '2026-09-07', end: TODAY };

    it('counts finished weeks, capping extra completions at the target', () => {
      // 5 (capped to 3), 1, 2 — and this week, not met yet, is left out.
      const h = history('2026-09-07', 'xxxxx.. x...... xx..... ');
      expect(completionRate(threeAWeek, h, sept, TODAY)).toMatchObject({ done: 6, due: 9 });
    });

    it('includes this week once its target is met', () => {
      const h = history('2026-09-07', 'xxxxx.. x...... xx..... xxx');
      expect(completionRate(threeAWeek, h, sept, TODAY)).toMatchObject({ done: 9, due: 12 });
    });
  });
});

describe('weekday breakdown', () => {
  it('gives a rate for each weekday, Sunday first', () => {
    const b = weekdayBreakdown(weekdays, history('2026-09-21', 'xxxx-.. xxx'), lastTenDays, TODAY);
    expect(b).toHaveLength(7);
    expect(b[0]).toEqual({ weekday: 0, done: 0, due: 0, rate: null }); // Sunday: never due
    expect(b[1]).toMatchObject({ done: 2, due: 2, rate: 1 }); // Mondays 21, 28
    expect(b[5]).toMatchObject({ done: 0, due: 1, rate: 0 }); // Friday 25
  });

  it("leaves today out until it's done", () => {
    const b = weekdayBreakdown(weekdays, history('2026-09-21', 'xxxx-.. xx-'), lastTenDays, TODAY);
    expect(b[3]).toMatchObject({ done: 1, due: 1 }); // Wednesday 23 only
  });
});

describe('heatmap', () => {
  it('turns a share into a level from 0 to 4', () => {
    expect([0, 0.2, 0.5, 0.8, 1, 1.5].map(levelFor)).toEqual([0, 1, 2, 3, 4, 4]);
  });

  it('shows partial progress on count habits, and blanks outside the history', () => {
    const water = habit({ type: 'count', targetCount: 8, createdDay: '2026-09-26' });
    const cells = habitHeatmap(
      water,
      history('2026-09-26', '842-'),
      { start: '2026-09-25', end: '2026-10-01' },
      TODAY,
    );
    expect(cells.map((c) => c.level)).toEqual([
      null, // 25: before the habit existed
      4, // 26: 8 of 8
      2, // 27: 4 of 8
      1, // 28: 2 of 8
      0, // 29: nothing
      0, // 30: today, nothing yet
      null, // 1 Oct: the future
    ]);
  });

  it("leaves days that aren't due blank", () => {
    const cells = habitHeatmap(
      weekdays,
      history('2026-09-26', 'xx'),
      { start: '2026-09-26', end: '2026-09-27' },
      TODAY,
    );
    expect(cells.map((c) => c.level)).toEqual([null, null]);
  });

  it('combines all habits into one level per day', () => {
    const created = { createdDay: '2026-09-28' };
    const cells = overallHeatmap(
      [
        { habit: habit({ id: 'a', ...created }), history: history('2026-09-28', 'xx') },
        {
          habit: habit({ id: 'b', type: 'count', targetCount: 4, ...created }),
          history: history('2026-09-28', '42'),
        },
        {
          habit: habit({ id: 'c', schedule: { kind: 'timesPerWeek', times: 3 }, ...created }),
          history: history('2026-09-28', 'x'),
        },
      ],
      { start: '2026-09-27', end: '2026-10-01' },
      TODAY,
    );
    expect(cells.map((c) => c.level)).toEqual([
      null, // 27: before any habit existed
      4, // 28: all three done
      3, // 29: a done, b half done, c resting (doesn't count against the day)
      0, // 30: nothing yet
      null, // 1 Oct: the future
    ]);
  });
});

describe('total completions', () => {
  it('counts every completed day, due or not', () => {
    expect(totalCompletions(weekdays, history('2026-09-21', 'xxxxxx.'))).toBe(6);
  });
});
