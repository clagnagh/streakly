// When to offer "Install Streakly". Pure, so it's easy to test.

import { daysBetween, type DayKey } from '../core/index.ts';

export const INSTALL_SNOOZE_DAYS = 14;

export type InstallSituation = {
  /** Already running as an installed app. */
  installed: boolean;
  /** Has completed at least one habit, ever (so they know it's worth keeping). */
  hasCompleted: boolean;
  /** The browser offered its install button (Chrome, Edge, Android). */
  canPrompt: boolean;
  /** iPhone/iPad: no install button, but "Add to Home Screen" works. */
  isIos: boolean;
  dismissedDay: DayKey | null;
  today: DayKey;
};

export type InstallOffer = 'prompt' | 'ios' | null;

export function installOffer(s: InstallSituation): InstallOffer {
  if (s.installed || !s.hasCompleted) return null;
  if (s.dismissedDay && daysBetween(s.dismissedDay, s.today) < INSTALL_SNOOZE_DAYS) return null;
  if (s.canPrompt) return 'prompt';
  if (s.isIos) return 'ios';
  return null;
}

/** iPhone, iPod or iPad (iPads also report themselves as Macs with touch). */
export function looksLikeIos(userAgent: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}
