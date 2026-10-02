import { describe, expect, it } from 'vitest';
import { minutesIntoDay, overdueReminders, type ReminderHabit } from '../../src/core/reminders.ts';
import { TODAY, habit, history } from './builders.ts';

// Today is Wednesday 30 Sep 2026; the day starts at 4 a.m.
const r = (over: Partial<ReminderHabit> = {}): ReminderHabit => ({
  ...habit(),
  reminderTime: '08:30',
  ...over,
});
const overdue = (habits: ReminderHabit[], now: string, histories = {}) =>
  overdueReminders(habits, histories, TODAY, now, 4, 1).map((h) => h.id);

describe('minutes into the day', () => {
  it('counts from the day-start hour', () => {
    expect(minutesIntoDay('04:00', 4)).toBe(0);
    expect(minutesIntoDay('08:30', 4)).toBe(270);
    expect(minutesIntoDay('01:00', 4)).toBe(21 * 60); // late in the same habit day
  });
});

describe('overdue reminders', () => {
  it('appear once the reminder time has passed', () => {
    expect(overdue([r()], '08:29')).toEqual([]);
    expect(overdue([r()], '08:30')).toEqual(['h1']);
    expect(overdue([r()], '15:00')).toEqual(['h1']);
  });

  it('at 1 a.m. it is still the same habit day, so the evening reminder has passed', () => {
    const evening = r({ id: 'evening', reminderTime: '21:00' });
    expect(overdue([evening], '20:59')).toEqual([]);
    expect(overdue([evening], '01:00')).toEqual(['evening']);
  });

  it('a 2 a.m. reminder belongs to the end of the habit day, not the start', () => {
    const late = r({ id: 'late', reminderTime: '02:00' });
    expect(overdue([late], '23:00')).toEqual([]);
    expect(overdue([late], '02:30')).toEqual(['late']);
  });

  it('go away once the habit is done', () => {
    expect(overdue([r()], '09:00', { h1: history(TODAY, 'x') })).toEqual([]);
  });

  it('count habits stay until the target is reached', () => {
    const water = r({ type: 'count', targetCount: 8 });
    expect(overdue([water], '09:00', { h1: history(TODAY, '5') })).toEqual(['h1']);
  });

  it('skip habits without a reminder, not due today, or archived', () => {
    expect(overdue([r({ reminderTime: null })], '09:00')).toEqual([]);
    expect(overdue([r({ schedule: { kind: 'weekdays', days: [1] } })], '09:00')).toEqual([]);
    expect(overdue([r({ archivedDay: '2026-09-20' })], '09:00')).toEqual([]);
  });

  it('"X times a week" habits stop reminding once the week is met', () => {
    const run = r({ schedule: { kind: 'timesPerWeek', times: 2 } });
    expect(overdue([run], '09:00', { h1: history('2026-09-28', 'x') })).toEqual(['h1']);
    expect(overdue([run], '09:00', { h1: history('2026-09-28', 'xx') })).toEqual([]);
  });
});
