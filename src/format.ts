// Words for the screen: dates, schedules and streaks.

import {
  weekdayOf,
  type DayKey,
  type Schedule,
  type Streak,
  type WeekStart,
  type Weekday,
} from './core/index.ts';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Weekdays in display order for the user's week start. */
export function weekdaysInOrder(weekStartsOn: WeekStart): Weekday[] {
  return Array.from({ length: 7 }, (_, i) => ((i + weekStartsOn) % 7) as Weekday);
}

export const weekdayShort = (d: Weekday) => WEEKDAY_SHORT[d];

/** "Wednesday 30 September" (the day key is read as a calendar date, never shifted by time zone). */
export function formatDay(
  day: DayKey,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' },
) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
    ...options,
    timeZone: 'UTC',
  });
}

export function scheduleLabel(schedule: Schedule, weekStartsOn: WeekStart = 1): string {
  switch (schedule.kind) {
    case 'daily':
      return 'Every day';
    case 'timesPerWeek':
      return schedule.times === 1 ? 'Once a week' : `${schedule.times} times a week`;
    case 'weekdays': {
      const days = weekdaysInOrder(weekStartsOn).filter((d) => schedule.days.includes(d));
      if (days.length === 7) return 'Every day';
      if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
      if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
      return days.map(weekdayShort).join(', ');
    }
  }
}

/** "12-day streak", "1-week streak", or "" for no streak yet. */
export function streakLabel(streak: Streak): string {
  if (streak.count === 0) return '';
  return `${streak.count}-${streak.unit === 'days' ? 'day' : 'week'} streak`;
}

/** "12 days", "1 week". */
export function streakLength(streak: Streak): string {
  const unit = streak.unit === 'days' ? 'day' : 'week';
  return `${streak.count} ${unit}${streak.count === 1 ? '' : 's'}`;
}

export function isWeekend(day: DayKey) {
  const d = weekdayOf(day);
  return d === 0 || d === 6;
}

/** A habit name as shown on screen: first letter capitalised ("meditate" → "Meditate"). The saved name is unchanged. */
export function displayName(name: string): string {
  // Leave deliberate lowercase starts alone, like "iPhone-free hour".
  if (/^\p{Ll}\p{Lu}/u.test(name)) return name;
  return name.charAt(0).toLocaleUpperCase() + name.slice(1);
}
