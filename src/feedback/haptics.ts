// Little buzzes on Android (navigator.vibrate). iPhones don't support web
// vibration, so haptics are always a bonus, never the only feedback.

/** Vibration patterns in ms: buzz, pause, buzz… */
export const hapticPatterns = {
  tap: [10],
  complete: [15, 40, 25],
  milestone: [30, 60, 30, 60, 80],
} as const;

export type HapticKind = keyof typeof hapticPatterns;

export function haptic(kind: HapticKind, enabled: boolean): void {
  if (!enabled) return;
  try {
    navigator.vibrate?.([...hapticPatterns[kind]]);
  } catch {
    // Some browsers throw if vibration isn't allowed yet; it's only a bonus.
  }
}
