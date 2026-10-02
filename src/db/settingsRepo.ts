// App settings, stored as one row per setting. Values are saved as JSON text
// and read back with their real types; anything missing or unreadable falls
// back to its default, so a damaged setting can never crash the app.

import type { DayKey, FreezeAllowance, Plan, WeekStart } from '../core/index.ts';
import type { Db } from './adapter.ts';

export type ThemeChoice = 'system' | 'light' | 'dark';

export const settingDefaults = {
  theme: 'system' as ThemeChoice,
  /** The hour a new day starts (4 = 4 a.m.). */
  dayStartHour: 4,
  weekStartsOn: 1 as WeekStart,
  hapticsEnabled: true,
  /** Highlight habits whose reminder time has passed (and notify, if allowed). */
  remindersEnabled: true,
  /** We explained notifications and asked once; don't ask again. */
  notificationsAsked: false,
  /** The day "Not now" was tapped on the install card (it waits 14 days). */
  installDismissedDay: null as DayKey | null,
  /** ISO timestamp of finishing onboarding, or null. */
  onboardedAt: null as string | null,
  freezeAllowance: null as FreezeAllowance,
  lastBackupAt: null as string | null,
  /** The plan last confirmed by the store (Milestone 8 keeps this up to date). */
  plan: 'free' as Plan,
};

export type Settings = typeof settingDefaults;
export type SettingKey = keyof Settings;

const keys = Object.keys(settingDefaults) as SettingKey[];

function parse<K extends SettingKey>(key: K, text: string | undefined): Settings[K] {
  if (text === undefined) return settingDefaults[key];
  try {
    const value: unknown = JSON.parse(text);
    const fallback = settingDefaults[key];
    // Only accept a value of the same kind as the default.
    if (fallback === null || typeof value === typeof fallback) return value as Settings[K];
  } catch {
    // Unreadable: use the default.
  }
  return settingDefaults[key];
}

export function settingsRepo(db: Db) {
  return {
    async get<K extends SettingKey>(key: K): Promise<Settings[K]> {
      const row = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [
        key,
      ]);
      return parse(key, row?.value);
    },

    async getAll(): Promise<Settings> {
      const rows = await db.all<{ key: string; value: string }>('SELECT key, value FROM settings');
      const stored = new Map(rows.map((r) => [r.key, r.value]));
      return Object.fromEntries(keys.map((k) => [k, parse(k, stored.get(k))])) as Settings;
    },

    async set<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
      await db.run(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
        [key, JSON.stringify(value)],
      );
    },
  };
}

export type SettingsRepo = ReturnType<typeof settingsRepo>;
