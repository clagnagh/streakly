// Applies the theme choice to the page. "system" removes the override so the
// CSS follows the device; "light"/"dark" force it with data-theme on <html>.
//
// The choice is saved in the database (settings.theme). A copy is also kept in
// localStorage only so the right theme shows instantly on the next visit,
// before the database has opened; if storage is blocked, that step is skipped.

import type { ThemeChoice } from '../db/settingsRepo.ts';

const KEY = 'streakly-theme';

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // Storage blocked: the database still has the real setting.
  }
}

/** Called before the first render, from main.tsx. */
export function applySavedThemeEarly(): void {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
  } catch {
    // Ignore.
  }
}
