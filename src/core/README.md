# src/core — pure habit rules

Everything that decides _what's due_ and _what counts as a streak_ lives here, so it can be
tested without a browser (`tests/core/`).

| File          | What it does                                                        |
| ------------- | ------------------------------------------------------------------- |
| `types.ts`    | `DayKey`, `Habit`, `Completion`, `HabitHistory`, `Plan`             |
| `dates.ts`    | `dayKey(instant, dayStartHour, timeZone)` and calendar maths        |
| `schedule.ts` | What's due, what counts as done, which days can be edited           |
| `streaks.ts`  | Current and best streaks for every schedule, freezes and milestones |
| `stats.ts`    | Completion rates, weekday breakdown, heatmap levels                 |
| `limits.ts`   | Every free-versus-Pro number and rule                               |

Import from `index.ts`. The rules and the decisions behind them are in `PLAN.md` section 5.

Files here must not:

- import React, the database, the store, the theme, or any service;
- use browser globals (`window`, `document`, `navigator`, `localStorage`, `fetch`…);
- read the clock (`Date.now()`, `new Date()`) or use `Math.random()`.

"Today" and "now" are always passed in as arguments. ESLint enforces all of this
(`eslint.config.js`); never switch the rule off to make lint pass.

Imports between core files end in `.ts` (`./dates.ts`).
