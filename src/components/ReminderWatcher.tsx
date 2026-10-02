import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { displayName } from '../format.ts';
import { notificationState, showReminder } from '../pwa/notifications.ts';
import { useHabitStore } from '../store/context.tsx';
import { overdueIds } from '../store/selectors.ts';

// Reminders already sent, as "habitId:day", so each habit nudges once a day.
const sent = new Set<string>();

/**
 * While Streakly is open but in the background (another tab or app in
 * front), sends a notification when a reminder time passes. When Streakly
 * is in front, the highlight on Today is enough.
 */
export function ReminderWatcher() {
  const s = useHabitStore(
    useShallow((st) => ({
      habits: st.habits,
      histories: st.histories,
      today: st.today,
      nowTime: st.nowTime,
      dayStartHour: st.settings.dayStartHour,
      weekStartsOn: st.settings.weekStartsOn,
      enabled: st.settings.remindersEnabled,
    })),
  );
  const overdue = useMemo(
    () => overdueIds(s.habits, s.histories, s.today, s.nowTime, s.dayStartHour, s.weekStartsOn),
    [s.habits, s.histories, s.today, s.nowTime, s.dayStartHour, s.weekStartsOn],
  );

  useEffect(() => {
    if (!s.enabled || notificationState() !== 'granted') return;
    if (document.visibilityState === 'visible') return;
    for (const habit of s.habits) {
      const key = `${habit.id}:${s.today}`;
      if (!overdue.has(habit.id) || sent.has(key)) continue;
      sent.add(key);
      void showReminder(
        habit.id,
        `${habit.emoji ? `${habit.emoji} ` : ''}${displayName(habit.name)}`,
        'A gentle reminder, whenever you’re ready.',
      );
    }
  }, [overdue, s.enabled, s.habits, s.today]);

  return null;
}
