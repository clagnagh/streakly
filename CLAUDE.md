# Streakly — notes for Claude

A calm, offline-first habit tracker, built as a web app (PWA). No account, no server: data lives on
the device.

**Follow the Working Agreement in `PLAN.md` (section 1) every session.** Work only on the milestone
named, plan before code and wait for "go", and finish each milestone with ticked boxes, a commit, a
"What you just learned" summary, and exact click-through steps at the live URL.

## Stack

- Vite 8, React 19, React Router 8 (hash routes), TypeScript 5.9 (strict).
- Vitest for unit tests (`tests/`), Playwright for browser tests and screenshots (`e2e/`).
- ESLint 10 + typescript-eslint + react-hooks, Prettier 3.
- Styling: CSS Modules (`*.module.css`) that use only theme CSS variables.
- Don't add any package that isn't listed in `PLAN.md` section 3 without asking first.

## Commands

| Command               | What it does                                                          |
| --------------------- | --------------------------------------------------------------------- |
| `npm run dev`         | Dev server at http://localhost:5173/streakly/                         |
| `npm test`            | Vitest unit tests                                                     |
| `npm run typecheck`   | `tsc --noEmit`                                                        |
| `npm run lint`        | ESLint                                                                |
| `npm run format`      | Prettier (rewrites files)                                             |
| `npm run build`       | Typecheck + production build into `dist/`                             |
| `npm run e2e`         | Playwright smoke tests against the production build                   |
| `npm run screenshots` | Every page at phone/desktop, light/dark → `screenshots/` (not in git) |

Run `npm test` and `npm run typecheck` after every task. In Claude's cloud sandbox, set
`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium` before Playwright commands (never run
`playwright install` there).

## Live site

`main` deploys to https://clagnagh.github.io/streakly/ via `.github/workflows/deploy.yml`. Work on a
branch and open a PR; merging deploys. `vite.config.ts` must keep `base: '/streakly/'` until we move
to a custom domain.

## Rules

- **Pure core.** `src/core/` holds all habit rules and must not import React, the database, the
  store, the theme or any service, or use browser globals, `Date.now()`, `new Date()` or
  `Math.random()`. "Today" is passed in. ESLint enforces this; never disable the rule to pass lint.
  Imports inside `src/core/` end in `.ts`.
- **Architecture.** Pages call store actions; the store calls repositories (`src/db/`) and the core.
  No SQL outside `src/db/`. Pages read state; they don't calculate rules.
- **Design tokens, never raw values.** Colours, spacing, font sizes, radii, shadows and durations
  come from `src/theme/`. In CSS use variables (`var(--space-lg)`, `var(--color-accent)`); in TSX
  use `vars` from `src/theme` (`vars.color.accent`). Hex colours are only allowed in `src/theme/`
  (ESLint checks TS; `tests/theme.test.ts` checks CSS for hex, rgb/hsl and px values over 1).
  Need a new value? Add a token first.
- **Themes.** Light is default; dark follows the system; `data-theme="light|dark"` on an element
  forces a theme. Every theme has the same keys and passes the contrast tests (text ≥ 4.5:1, habit
  colours ≥ 3:1 on surface).
- **Offline first.** Every feature works in airplane mode after the first visit. Nothing blocks on
  a network request.
- **Accessibility.** Every tap target is at least `--size-min-tap` (44 px). Respect
  `prefers-reduced-motion`: replace movement with fades.
- **Database.** SQLite (WASM) runs in a Web Worker (`src/db/worker.ts`) on OPFS storage
  (`opfs-sahpool`). The app talks to it through the async `Db` interface (`src/db/adapter.ts`):
  `get`, `all`, `run`, and `batch` for atomic multi-statement writes. Tests use the same interface
  on `node:sqlite` (`src/db/nodeAdapter.ts`, tests only). Repositories (`habitsRepo`,
  `completionsRepo`, `settingsRepo`) hold all SQL and return core types. Use `?` parameters, never
  string-built values.
- **Migrations.** Schema changes are new numbered entries in `src/db/schema.ts`; never edit a
  migration that has shipped. The version lives in `PRAGMA user_version`. Add a test for each one.
- **One tab at a time.** `src/db/tabLock.ts` (Web Locks + BroadcastChannel) decides which tab owns
  the database; `src/db/connection.ts` tracks its state for `useDatabase()`.
- **Store.** `src/store/habitStore.ts` (Zustand) holds habits, histories, settings and `today`.
  Pages read it with `useHabitStore(selector)` (use `useShallow` when picking several fields) and
  call actions from `useActions()`. Derived screen data comes from `src/store/selectors.ts`, which
  calls the core rules; wrap it in `useMemo`. Writes are optimistic: update state, save, and roll
  back with a friendly `error` (shown by `<Toast>`) if the save fails.
- **Clock in, not read.** Only `src/store/clock.ts` reads the real clock (`systemClock`); the store
  refreshes `today` on focus, on tab visibility and every minute. Repositories take `today`/`now`
  as arguments. Tests pass a fixed clock; e2e tests use `page.clock`.
- **Screen text** (dates, schedules, streaks) comes from `src/format.ts`. Shared plain button/form
  styles are in `src/components/ui.module.css`.
- **Hidden dev pages:** `#/dev/tokens` (every token) and `#/dev/db` (counts, sample data, read-only
  SQL box). Unlinked; remove before launch (Milestone 9).
- Don't edit `LEARNINGS.md` unless asked.

## Tone of voice

Warm, calm and encouraging — never guilt-tripping. A missed day is "a fresh start", not a failure.
No exclamation-mark pressure, no shaming streak-loss copy.

## Screenshot protocol

When the user sends a screenshot:

1. Describe what you see in 2–3 sentences.
2. List the problems you notice before hearing theirs.
3. Propose specific changes with exact token values (e.g. "card padding `space.lg` → `space.xl`,
   radius `md` → `lg`") and wait for their pick.
