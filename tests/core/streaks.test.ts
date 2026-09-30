import { describe, expect, it } from 'vitest';
import { dayKey } from '../../src/core/dates.ts';
import { isComplete } from '../../src/core/schedule.ts';
import { milestoneReached, streaks } from '../../src/core/streaks.ts';
import type { Habit, HabitHistory } from '../../src/core/types.ts';
import { TODAY, habit, history, withCompletion } from './builders.ts';

// Today is Wednesday 30 Sep 2026. Patterns: x done, - missed, . not due, f freeze.
const current = (h: Habit, hist: HabitHistory, today = TODAY) => streaks(h, hist, today).current;
const best = (h: Habit, hist: HabitHistory, today = TODAY) => streaks(h, hist, today).best;

describe('daily streaks', () => {
  it('count consecutive done days', () => {
    expect(current(habit(), history('2026-09-21', 'xxxxxxxxxx'))).toEqual({
      count: 10,
      unit: 'days',
    });
  });

  it("today doesn't break a streak: not done yet still shows yesterday's", () => {
    expect(current(habit(), history('2026-09-26', 'xxxx-')).count).toBe(4);
  });

  it('a missed day breaks the streak', () => {
    expect(current(habit(), history('2026-09-24', 'xx-xxx-')).count).toBe(3);
  });

  it('a missed yesterday means a fresh start today', () => {
    expect(current(habit(), history('2026-09-25', 'xxxx--')).count).toBe(0);
  });

  it('best streak remembers the longest run', () => {
    const h = history('2026-09-10', 'xxxxx-xx');
    expect(current(habit(), h).count).toBe(0);
    expect(best(habit(), h).count).toBe(5);
  });

  it('best streak includes the current run', () => {
    expect(best(habit(), history('2026-09-24', 'xx-xxxx')).count).toBe(4);
  });
});

describe('specific-weekday streaks', () => {
  const weekdays = habit({
    createdDay: '2026-09-14',
    schedule: { kind: 'weekdays', days: [1, 2, 3, 4, 5] },
  });

  it('days that are not due neither continue nor break the streak', () => {
    // Mon–Fri done for two and a half weeks; weekends skipped.
    expect(current(weekdays, history('2026-09-14', 'xxxxx.. xxxxx.. xxx')).count).toBe(13);
  });

  it("doing it on a day that isn't due doesn't add to the streak", () => {
    expect(current(weekdays, history('2026-09-14', 'xxxxxxx xxxxxxx xxx')).count).toBe(13);
  });

  it('a missed due day still breaks it', () => {
    // Friday 25th missed.
    expect(current(weekdays, history('2026-09-21', 'xxxx-.. xxx')).count).toBe(3);
  });
});

describe('count habits', () => {
  const water = habit({ type: 'count', targetCount: 8 });

  it('only days where the target was reached count', () => {
    // 26: 8, 27: 8, 28: 5 (short), 29: 8.
    expect(current(water, history('2026-09-26', '8858')).count).toBe(1);
  });

  it("partial progress today doesn't break the streak", () => {
    expect(current(water, history('2026-09-26', '88884')).count).toBe(4);
  });
});

describe('freezes', () => {
  it('a freeze on a missed day keeps the streak alive without adding to it', () => {
    expect(current(habit(), history('2026-09-25', 'xxfxx')).count).toBe(4);
    expect(current(habit(), history('2026-09-25', 'xx-xx')).count).toBe(2);
  });

  it('a freeze on a day that was done changes nothing', () => {
    const h = history('2026-09-27', 'xxx');
    expect(current(habit(), { ...h, freezes: ['2026-09-28'] }).count).toBe(3);
  });
});

describe('backfill and history', () => {
  it('filling in a missed past day recalculates the streak', () => {
    const before = history('2026-09-26', 'xx-xx');
    expect(current(habit(), before).count).toBe(2);
    expect(current(habit(), withCompletion(before, '2026-09-28')).count).toBe(5);
  });

  it('completions after today are ignored', () => {
    const h = withCompletion(history('2026-09-26', 'xxxxx'), '2026-10-02');
    expect(current(habit(), h).count).toBe(5);
  });

  it('days before the habit existed are not missed days', () => {
    const newHabit = habit({ createdDay: '2026-09-29' });
    expect(current(newHabit, history('2026-09-29', 'x')).count).toBe(1);
  });

  it('backfilled days before the habit was created still count', () => {
    const newHabit = habit({ createdDay: '2026-09-29' });
    expect(current(newHabit, history('2026-09-25', 'xxxxxx')).count).toBe(6);
  });

  it('archiving freezes the streak where it was; later days do not break it', () => {
    const archived = habit({ archivedDay: '2026-09-28' });
    expect(current(archived, history('2026-09-20', 'xxxxxxxx')).count).toBe(8);
  });
});

describe('"X times a week" streaks', () => {
  // Weeks start on Monday: 7, 14, 21 and 28 (this week) September.
  const threeAWeek = habit({
    createdDay: '2026-09-07',
    schedule: { kind: 'timesPerWeek', times: 3 },
  });

  it('count weeks where the target was met', () => {
    const h = history('2026-09-07', 'xxx.... x.x.x.. .x.x.x.');
    expect(current(threeAWeek, h)).toEqual({ count: 3, unit: 'weeks' });
  });

  it('the current week is in progress and does not break the streak', () => {
    // This week: only 1 so far.
    const h = history('2026-09-07', 'xxx.... xxx.... xxx.... x');
    expect(current(threeAWeek, h).count).toBe(3);
  });

  it('the current week counts as soon as the target is met', () => {
    const h = history('2026-09-07', 'xxx.... xxx.... xxx.... xxx');
    expect(current(threeAWeek, h).count).toBe(4);
  });

  it('a finished week that missed the target breaks the streak', () => {
    const h = history('2026-09-07', 'xxx.... xx..... xxx....');
    expect(current(threeAWeek, h).count).toBe(1);
    expect(best(threeAWeek, h).count).toBe(1);
  });

  it('one freeze saves a whole missed week', () => {
    const h = history('2026-09-07', 'xxx.... xxf.... xxx....');
    expect(current(threeAWeek, h).count).toBe(2);
  });

  it('the partial first week cannot break the streak', () => {
    // Created on Saturday 12th: only 2 days left in that week.
    const h = history('2026-09-12', 'x. xxx.... xxx....');
    expect(current({ ...threeAWeek, createdDay: '2026-09-12' }, h).count).toBe(2);
  });

  it('uses the week start setting', () => {
    // Done Sun, Mon, Tue three weeks running.
    const h = history('2026-09-13', 'xxx.... xxx.... xxx');
    const sundayHabit = { ...threeAWeek, createdDay: '2026-09-13' };
    expect(streaks(sundayHabit, h, TODAY, 0).current.count).toBe(3); // Sun–Sat weeks
    expect(streaks(sundayHabit, h, TODAY, 1).current.count).toBe(2); // Mon–Sun weeks
  });
});

describe('timezone travel', () => {
  const NEW_YORK = 'America/New_York';
  const TOKYO = 'Asia/Tokyo';
  const LOS_ANGELES = 'America/Los_Angeles';

  it('flying east: yesterday stays done, today is not done, streak unbroken', () => {
    // Done at 23:00 on Tue 29 Sep in New York…
    const doneAt = dayKey(new Date('2026-09-30T03:00:00Z'), 4, NEW_YORK);
    expect(doneAt).toBe('2026-09-29');
    const h = withCompletion(history('2026-09-26', 'xxx'), doneAt);

    // …then the app is opened the next afternoon in Tokyo.
    const todayInTokyo = dayKey(new Date('2026-09-30T06:00:00Z'), 4, TOKYO);
    expect(todayInTokyo).toBe('2026-09-30');
    expect(h.completions.some((c) => c.dayKey === todayInTokyo)).toBe(false);
    expect(current(habit(), h, todayInTokyo).count).toBe(4);
  });

  it('flying west: a day already done stays done, with nothing duplicated', () => {
    // Done at 20:00 on Thu 1 Oct in Tokyo…
    const doneAt = dayKey(new Date('2026-10-01T11:00:00Z'), 4, TOKYO);
    expect(doneAt).toBe('2026-10-01');
    const h = withCompletion(history('2026-09-28', 'xxx'), doneAt);

    // …landing in Los Angeles, where it's still Thursday afternoon.
    const todayInLA = dayKey(new Date('2026-10-01T21:00:00Z'), 4, LOS_ANGELES);
    expect(todayInLA).toBe('2026-10-01');
    const todays = h.completions.filter((c) => c.dayKey === todayInLA);
    expect(todays).toHaveLength(1);
    expect(isComplete(habit(), todays[0]!.count)).toBe(true);
    expect(current(habit(), h, todayInLA).count).toBe(4);
  });
});

describe('milestones', () => {
  it('reports a milestone when a streak reaches it', () => {
    expect(milestoneReached(6, 7)).toBe(7);
    expect(milestoneReached(29, 30)).toBe(30);
  });

  it('reports nothing between milestones or when a streak goes down', () => {
    expect(milestoneReached(7, 8)).toBeNull();
    expect(milestoneReached(8, 7)).toBeNull();
  });

  it('reports the biggest one crossed by a backfill jump', () => {
    expect(milestoneReached(5, 31)).toBe(30);
  });
});
