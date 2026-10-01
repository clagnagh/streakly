// The app's one window onto the real clock. Everything else gets the time
// from here, so tests can swap in a fixed clock.

import { dayKey, type DayKey } from '../core/index.ts';

export type Clock = {
  now(): Date;
  /** The device's current time zone, e.g. "Europe/London". */
  timeZone(): string;
};

export const systemClock: Clock = {
  now: () => new Date(),
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export function todayFrom(clock: Clock, dayStartHour: number): DayKey {
  return dayKey(clock.now(), dayStartHour, clock.timeZone());
}
