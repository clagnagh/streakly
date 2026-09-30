# Core rule tests

Where each rule in `PLAN.md` section 5 is tested. "Today" in these tests is Wednesday 30 Sep 2026.
Histories are written as one character per day (`builders.ts`): `x` done, `-` missed, `.` not
due, `f` freeze, `1`–`9` partial progress.

| Rule                                         | Test file                                                  |
| -------------------------------------------- | ---------------------------------------------------------- |
| Day start (1 a.m. counts for the day before) | `dates.test.ts` › dayKey                                   |
| Timezone travel                              | `streaks.test.ts` › timezone travel; `dates.test.ts`       |
| Daily streaks, non-due days                  | `streaks.test.ts` › daily / specific-weekday streaks       |
| "X times a week" streaks                     | `streaks.test.ts` › "X times a week" streaks               |
| Today doesn't break a streak                 | `streaks.test.ts` › daily streaks, count habits, weekly    |
| Count habits                                 | `streaks.test.ts` › count habits; `stats.test.ts` heatmap  |
| Freezes                                      | `streaks.test.ts` › freezes; `limits.test.ts` › freezes    |
| Backfill; no future days                     | `streaks.test.ts` › backfill; `schedule.test.ts` › editing |
| Archiving keeps history, hides from Today    | `schedule.test.ts`; `streaks.test.ts` › archiving          |
| Free limit, read-only after Pro ends         | `limits.test.ts`                                           |

Tested in later milestones (they need the database or the UI): deleting with confirmation and
cascade (Milestone 2), storage failures and the two-tabs lock (Milestones 2 and 7).
