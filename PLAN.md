# PLAN.md — Streakly: An Offline-First Habit Tracker (Web App / PWA)

> **Note to Claude:** This is the master build plan for this project. I'm learning AI-assisted coding, and this project focuses on three skills: building an installable web app that works offline (a PWA), designing offline-first data storage, and guiding visual design with a written design system and screenshots. Follow the Working Agreement in every session.

> **Changed from the mobile plan:** Streakly is now a web app that I can open in any browser and "install" to my phone's home screen. It has no app stores, no simulators and no Expo. It is deployed to a public URL from Milestone 0, so I can view every milestone on my laptop and my phone.

---

## 1. Working Agreement (read this first, every session)

1. **One milestone at a time.** Only work on the milestone I name.
2. **Plan before code.** Start each milestone by listing the files you'll create or change and your approach, then wait for my "go".
3. **Small steps.** Build one task at a time, then run `npm test` and `npm run typecheck`.
4. **No surprise dependencies.** Ask before adding any package not listed in section 3. Say how much it adds to the download size.
5. **Keep the core pure.** Nothing in `src/core/` may import React, the database, or browser APIs (`window`, `document`, `localStorage`, `navigator`, `Date.now()`). A lint rule enforces this.
6. **Use design tokens, never raw values.** All colours, spacing, font sizes, radii and durations come from `src/theme/`. Never write a hex colour or a hard-coded pixel value in a page or component.
7. **When I send a screenshot:**
   - First, describe what you see in 2–3 sentences.
   - Then list the problems you notice, before I tell you mine.
   - Then propose specific changes with exact token values, and wait for my pick.
8. **Assume offline.** Every feature must work with the network turned off after the first visit. Nothing may block on a network request.
9. **Finish every milestone the same way:**
   - Tick the checkboxes in this file.
   - Make a git commit with a clear message, and push so the live site updates.
   - Give me a **"What you just learned"** summary: 3 concepts in plain English, each with the file where it's used.
   - Tell me exactly what to click in the app (at the live URL) to check it works, and send screenshots at phone width (390 px) and desktop width.
10. **Flag problems with this plan.** If something here is unclear or a bad idea, say so.

---

## 2. Product Summary

Streakly is a calm, beautiful habit tracker that runs in the browser and works entirely on your device, with no account and no internet needed after the first visit. On a phone, you "Add to Home Screen" and it opens full-screen like a normal app.

**Main screens**

- **Today:** a list of habits due today, each with a big tap-to-complete control, plus a progress ring for the day.
- **Habit detail:** streak, calendar heatmap, stats, and history you can edit.
- **All habits:** reorder, archive, edit.
- **Stats:** overall completion rate, current and best streaks, and a yearly heatmap.
- **Settings:** theme, reminders, day-start time, export and import, install instructions, and the Pro upgrade.

**Layout:** mobile-first. On phones, a bottom tab bar. On screens wider than `breakpoints.desktop`, a left sidebar and a wider content column.

**Business model:** Free forever for up to 3 habits. **Streakly Pro** unlocks unlimited habits, themes, streak freezes, full history, and data export. It's sold as a monthly and yearly subscription, plus a lifetime option, through RevenueCat Web Billing (which uses Stripe to take card payments). No app-store cut.

### Habit types

| Type  | Example                    | Completion means               |
| ----- | -------------------------- | ------------------------------ |
| Check | "Meditate"                 | Tapped once                    |
| Count | "Drink 8 glasses of water" | Count reaches the daily target |

### Schedules

- **Daily:** due every day.
- **Specific weekdays:** e.g. Mon/Wed/Fri.
- **X times per week:** e.g. "3 times a week", where any 3 days count.

---

## 3. Tech Stack & Conventions

| Area              | Choice                                                                                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework         | Vite + React 19 + TypeScript (strict). A static single-page app: no server.                                                                                                                    |
| Routing           | React Router (library mode)                                                                                                                                                                    |
| Offline & install | `vite-plugin-pwa` (service worker caches the app; web manifest makes it installable)                                                                                                           |
| Database          | SQLite in the browser via `@sqlite.org/sqlite-wasm`, saved with the `opfs-sahpool` storage option, running in a Web Worker. Hand-written SQL and numbered migrations (no ORM, so I learn SQL). |
| App state         | Zustand (small store) — _ask me before installing_                                                                                                                                             |
| Animation         | CSS transitions + the Web Animations API first; `motion` (Motion for React) only if CSS can't do it — _ask first_                                                                              |
| Haptics           | `navigator.vibrate` where supported (Android). iPhones ignore it, so haptics are always a bonus, never required.                                                                               |
| Reminders         | In-app only (see Milestone 5 for why)                                                                                                                                                          |
| Payments          | `@revenuecat/purchases-js` (RevenueCat Web Billing)                                                                                                                                            |
| Charts/heatmap    | Custom SVG React components (no chart library)                                                                                                                                                 |
| Tests             | Vitest + `@testing-library/react` for logic and components; Playwright (Chromium) for end-to-end tests and screenshots. Core logic tests come first.                                           |
| DB tests          | Node's built-in `node:sqlite` (Node 22.18+), behind the same small adapter the app uses, so the same SQL is tested in Node. No extra package.                                                  |
| Lint/format       | ESLint + typescript-eslint + Prettier, with `no-restricted-imports` and `no-restricted-globals` blocking React, the database and browser APIs inside `src/core/**`                             |
| Hosting           | GitHub Pages, deployed by a GitHub Actions workflow on every push to `main`. Any static host works (Netlify, Cloudflare Pages).                                                                |

### Project layout

```
streakly/
├── index.html
├── public/                   # icons, manifest images, fonts
├── src/
│   ├── main.tsx              # starts React, registers the service worker
│   ├── routes/               # one file per page
│   │   ├── Today.tsx
│   │   ├── Habits.tsx
│   │   ├── Stats.tsx
│   │   ├── Settings.tsx
│   │   ├── HabitDetail.tsx   # /habit/:id
│   │   ├── HabitEdit.tsx     # /habit/new and /habit/:id/edit
│   │   ├── Paywall.tsx
│   │   └── dev/Tokens.tsx    # /dev/tokens (hidden, unlinked; removed in Milestone 9)
│   ├── theme/                # tokens.ts, themes.ts, typography.ts, tokens.css (CSS variables)
│   ├── core/                 # PURE logic: no React, no DB, no browser APIs
│   │   ├── dates.ts          # local day keys, day-start offset, week maths
│   │   ├── schedule.ts       # isDueOn(habit, date), dueDaysIn()
│   │   ├── streaks.ts        # current/best streak per schedule type
│   │   ├── stats.ts          # completion rates, heatmap buckets
│   │   ├── limits.ts         # free vs Pro rules
│   │   └── types.ts
│   ├── db/                   # worker, adapter, migrations, repositories
│   ├── store/                # Zustand store: loads from db, exposes actions
│   ├── components/           # HabitRow, CompleteButton, Heatmap, Ring, TabBar, etc.
│   ├── reminders/            # in-app reminder checks
│   ├── purchases/            # RevenueCat wrapper + a fake for development
│   └── backup/               # export/import JSON
├── tests/                    # Vitest unit tests
├── e2e/                      # Playwright tests
├── .github/workflows/deploy.yml
├── CLAUDE.md
├── PLAN.md
└── LEARNINGS.md              # my notes (Claude: don't edit unless asked)
```

### Architecture rule

Pages call store actions. The store calls repositories (the database) and the pure core. All habit rules — what's due, what counts as a streak — live in `src/core/` and are tested without a browser.

---

## 4. Data Model (SQLite)

```sql
CREATE TABLE habits (
  id              TEXT PRIMARY KEY,          -- crypto.randomUUID()
  name            TEXT NOT NULL,
  emoji           TEXT,
  color_key       TEXT NOT NULL,             -- a key into the theme, never a hex value
  type            TEXT NOT NULL CHECK (type IN ('check','count')),
  target_count    INTEGER NOT NULL DEFAULT 1,
  unit            TEXT,                      -- "glasses", "pages"
  schedule_kind   TEXT NOT NULL CHECK (schedule_kind IN ('daily','weekdays','times_per_week')),
  schedule_days   TEXT,                      -- "1,3,5" for weekdays
  times_per_week  INTEGER,
  reminder_time   TEXT,                      -- "08:30" local, NULL = none
  sort_order      INTEGER NOT NULL,
  created_day     TEXT NOT NULL,             -- local day key it was created (the rules use this)
  archived_day    TEXT,                      -- local day key it was archived, NULL = active
  created_at      TEXT NOT NULL              -- ISO timestamp, for the record
);

CREATE TABLE completions (
  id         TEXT PRIMARY KEY,
  habit_id   TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  day_key    TEXT NOT NULL,                  -- local date "YYYY-MM-DD"
  count      INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE (habit_id, day_key)
);
CREATE INDEX completions_by_day ON completions(day_key);

CREATE TABLE freezes (                       -- Pro: protect a streak on a missed day
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  day_key  TEXT NOT NULL,
  PRIMARY KEY (habit_id, day_key)
);

CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
-- keys (values stored as JSON; defaults in src/db/settingsRepo.ts):
--   theme, dayStartHour (4), weekStartsOn (0=Sun, 1=Mon), hapticsEnabled,
--   remindersEnabled, onboardedAt, freezeAllowance ({remaining, month} — refills
--   when the month changes), lastBackupAt, plan
-- The schema version is SQLite's PRAGMA user_version, not a setting.
```

**Why `day_key` rather than a timestamp:** habits belong to a _calendar day_ as the user experiences it. Storing the local day as text avoids nearly every timezone bug.

**Where the data lives:** in the browser's private file system for this site (OPFS), on this device only. Data isn't shared between browsers or devices; export/import moves it.

---

## 5. Core Rules & Edge Cases (must be covered by tests)

- **Day start:** the "day" ends at `day_start_hour` (4 a.m. by default), so a task done at 1 a.m. counts for the previous day.
- **Timezone travel:** flying between timezones must never delete or duplicate a completion. Day keys are computed from the device's current local time, and past records never change. Test case: done at 23:00 in New York, app opened next afternoon in Tokyo → yesterday stays done, today shows not done.
- **Daily streaks:** counted in consecutive _due_ days. A non-due day (e.g. Sunday for a Mon–Fri habit) neither continues nor breaks a streak.
- **X-times-per-week streaks:** counted in consecutive _weeks_ where the target was met. The current week counts as "in progress" and doesn't break a streak until it ends.
- **Today doesn't break a streak.** A habit not yet done today still shows yesterday's streak, not zero.
- **Count habits** show partial progress. A streak only counts days where the target was reached.
- **Freezes (Pro):** a freeze on a missed due day keeps the streak alive. You get a limited number per month, refilled when `freezes_month` changes.
- **Backfill:** you can edit any past day, and streaks recalculate. You can't complete a future day.
- **Archiving** keeps history but removes the habit from Today. Deleting asks for confirmation and removes completions too.
- **Free limit:** 3 active (non-archived) habits. If someone cancels Pro while over the limit, nothing is deleted. Extra habits become read-only until they archive some or resubscribe.
- **Storage failures** (storage blocked, quota full, private browsing, a second tab holding the database) show a friendly message and never crash the app.
- **Two tabs open:** only one tab may own the database at a time. A second tab shows "Streakly is open in another tab" with a button to switch here.

**Decisions made in Milestone 1** (A–H):

- **A.** A freeze bridges a missed day but doesn't add to the streak.
- **B.** Doing a habit on a day it isn't due doesn't add to the streak, but counts in total completions.
- **C.** For "X times a week" habits, one freeze saves a whole missed week.
- **D.** A weekly habit's first (partial) week can't break its streak; it only counts if the target is met.
- **E.** A habit's history starts on its created day, or its earliest backfilled completion if that's earlier.
- **F.** Weekly completion rate uses finished weeks (completions ÷ target, capped at 100%); the current week counts once met.
- **G.** Free: 3 active habits, 30 days of history. Pro: 2 freezes a month.
- **H.** Over the free limit, habits after the first 3 active ones (in the user's order) become read-only.

---

## 6. Milestones

### Milestone 0 — Project setup, design system & live site

- [x] Scaffold a Vite + React + TypeScript app with React Router, and run it with `npm run dev`.
- [x] Add Vitest, Playwright, ESLint, Prettier, and the lint rule blocking React, database and browser imports inside `src/core/**`. Show me the rule failing on a deliberate bad import, then remove it.
- [x] Deploy to GitHub Pages with a GitHub Actions workflow, and give me the live URL. (Routing must work on GitHub Pages: use hash routes or a `404.html` fallback, and set Vite's `base` to the repo name.)
- [x] Build `src/theme/`:
  - **Colour tokens:** background, surface, text primary/secondary, accent, success, danger, plus 8 habit colours. Light and dark themes.
  - **Spacing scale:** 4, 8, 12, 16, 24, 32, 48.
  - **Type scale:** display, title, body, caption, with weights and line heights.
  - **Radii, shadows, breakpoints and animation durations** (fast 120 ms, normal 220 ms, slow 400 ms).
  - Tokens are written once in TypeScript and turned into CSS variables (`--color-accent`, `--space-4`), so components use `var(--space-4)`.
- [x] Create a hidden `/dev/tokens` page showing every token, so I can review the design system visually.
- [x] A Playwright script (`npm run screenshots`) that saves every page at phone and desktop widths, in light and dark mode.
- [x] Create `CLAUDE.md` with: stack, commands, the pure-core rule, the design-token rule, the screenshot protocol, "offline first", and "follow PLAN.md Working Agreement". Include a short **tone of voice** note: warm, calm, never guilt-tripping.
- [x] Create `LEARNINGS.md` with headings: _Prompts that worked / Prompts that didn't / Design feedback that worked / Concepts learned_.

**Done when:** I can open the live URL on my laptop and phone, and `/dev/tokens` looks good to me.
**Explain to me:** what Vite does, what a single-page app and client-side routing are, and why design tokens beat hard-coded values.

### Milestone 1 — Core logic: dates, schedules, streaks

- [x] `dates.ts`: `dayKey(date, dayStartHour, timeZone)`, `addDays`, `weekRange(date, weekStartsOn)`, and `daysBetween`.
- [x] `schedule.ts`: `isDueOn(habit, dayKey)` and `dueDaysIn(habit, range)`.
- [x] `streaks.ts`: `currentStreak(habit, completions, today)` and `bestStreak(...)`, covering all three schedule types and freezes.
- [x] `stats.ts`: completion rate over a range, per-weekday breakdown, and heatmap buckets.
- [x] `limits.ts`: free-versus-Pro rules in one place.
- [x] Tests for every rule in section 5, including the 1 a.m. case, timezone travel, and "today doesn't break a streak".

**Done when:** all core tests pass with no React, database or browser involved.
**Explain to me:** why we store local day keys instead of timestamps, and how to test time-dependent code by passing in "today".

### Milestone 2 — Database layer

- [x] `db/worker.ts`: load SQLite WASM in a Web Worker, open the database with `opfs-sahpool`, turn on foreign keys, and run numbered migrations tracked by `PRAGMA user_version`.
- [x] `db/client.ts`: a small typed message layer so the app can call the worker with `await`.
- [x] `db/adapter.ts`: one tiny interface (`get`, `all`, `run`, `batch`) with two versions: the browser worker, and `node:sqlite` for tests.
- [x] Repositories: `habitsRepo`, `completionsRepo`, and `settingsRepo`, with typed functions and no SQL leaking outside `db/`.
- [x] Ask the browser for persistent storage (`navigator.storage.persist()`), and show the result in Settings.
- [x] A one-tab lock (Web Locks API) so two tabs never write at once.
- [x] A `seedDevData()` function (dev only) that creates 5 habits with 90 days of realistic history.
- [x] Tests against an in-memory database: migrations, cascade delete, and the unique constraint on (habit, day).

**Done when:** the dev seed loads in the browser, survives a page reload, and I can query it from a test.
**Explain to me:** migrations and why they matter after release, why the database runs in a Web Worker, and why a repository layer helps.

### Milestone 3 — Working app (function before beauty)

Plain, unstyled components only.

- [ ] Zustand store that loads habits and today's completions, with actions: `toggleComplete`, `incrementCount`, `createHabit`, `updateHabit`, `archiveHabit`, and `setCompletionForDay`.
- [ ] **Today page:** habit list, tap to complete, tap-and-hold (or a +/− stepper) for count habits, and a day progress indicator.
- [ ] **New/edit habit page:** name, emoji, colour, type, target, schedule, reminder time.
- [ ] **Habit detail:** streak numbers, last 30 days as a simple grid, and tap a past day to toggle it.
- [ ] **All habits:** list with drag-to-reorder (plus up/down buttons for keyboard users) and archive.
- [ ] Refresh "today" when the tab becomes visible again, so a tab left open overnight rolls over to the new day.
- [ ] Playwright test: create a habit, complete it, reload, and it's still complete.

**Done when:** I can create habits, complete them, edit past days, and see streaks update correctly — at the live URL.
**Explain to me:** how the store connects pages to the database, optimistic updates, and why the UI reads state instead of calculating rules itself.
**My checkpoint:** I'll send a screenshot, and you follow the screenshot protocol.

### Milestone 4 — Visual design & motion

- [ ] Redesign every page using the tokens: Today as a card list, a big satisfying complete control with a fill animation, and a day progress ring.
- [ ] Responsive layout: bottom tab bar on phones, sidebar on desktop. Respect the phone's safe areas (notch and home bar) when installed.
- [ ] Empty states with warm, encouraging copy. Loading skeletons.
- [ ] Animations: the complete control fills and springs, the row settles, completed items fade slightly, and pages transition smoothly (View Transitions API where supported, a plain fade elsewhere).
- [ ] Haptics on Android via `navigator.vibrate`: light on tap, a pattern on completion, and a bigger one for streak milestones (7, 30, 100 days), with a celebration animation.
- [ ] Support light and dark mode, following the system setting, with a manual override in settings.
- [ ] Respect "reduce motion" (`prefers-reduced-motion`): replace movement with fades.

**Done when:** I'm happy with how it looks and feels on my real phone and laptop. Decided by screenshot rounds, not tests.
**Explain to me:** why animating `transform` and `opacity` is smooth but animating `width` or `top` is not, and what makes a tap feel responsive.
**🎓 My checkpoint (design feedback experiment):** I'll first ask _"make Today look nicer"_, then ask for something specific like _"increase card padding to spacing.lg, drop the shadow, use a 2 px accent border on completed rows"_. I'll write the difference in the results into `LEARNINGS.md`.

### Milestone 5 — Installable app & reminders

- [ ] Web manifest (name, icons, theme colour, `display: standalone`) and a service worker that caches the whole app, so it opens with no network.
- [ ] An "Install Streakly" prompt: the browser's install button on Android/desktop Chrome, and "Share → Add to Home Screen" instructions on iPhone. Shown after the user has completed a habit, not on first visit.
- [ ] "A new version is ready — refresh" banner when the service worker updates.
- [ ] **In-app reminders:** when the app is opened or brought back to the front, gently highlight habits whose reminder time has passed and that aren't done yet. Optionally show a browser notification while the app is open, asking permission only when the first reminder is set, and explaining why first.
- [ ] Settings: a reminders toggle, and a clear note about what web reminders can and can't do.

**Why reminders are limited on the web:** a web app can't schedule a notification for later while it's closed. That needs **web push**, which requires a server to send each message, which breaks the "no server, no account" design. Web push is a stretch goal (section 8).

**Done when:** I can install Streakly on my phone's home screen, open it in airplane mode, and see an overdue reminder highlighted.
**Explain to me:** what a service worker is, what makes a web app "installable", and the difference between local and push notifications.

### Milestone 6 — Stats & heatmap

- [ ] A custom SVG heatmap component: a year of days, colour intensity by completion, horizontally scrollable on phones, with month labels.
- [ ] Habit detail: current streak, best streak, completion rate, per-weekday bar chart, and total completions.
- [ ] Stats page: an overall heatmap across all habits, this week's summary, and a "best day of the week" insight.
- [ ] Performance check with 3 years of seeded data: the pages must stay smooth. Measure with Chrome DevTools' Performance panel and CPU throttling set to 4×.

**Done when:** the heatmap renders 365 days smoothly on a mid-range phone.
**Explain to me:** basic SVG in React, and memoisation (why recalculating stats on every render is a problem).

### Milestone 7 — Settings, onboarding, backup & accessibility

- [ ] Onboarding: 3 friendly screens, then create the first habit. It runs only once.
- [ ] Settings: theme, week start, day-start hour, haptics, reminders, and contact.
- [ ] Export to a JSON file download (Pro), and import from a file with a preview of what will change and a confirmation.
- [ ] Backup nudge: because the browser can clear site data, show a gentle "back up your data" reminder if `last_backup_at` is more than 30 days old (free users can export too for this; Pro gates only automatic/advanced export options — decide the exact split with me).
- [ ] Accessibility: screen-reader labels on every control, full keyboard navigation with visible focus rings, works at 200% browser zoom, colour contrast of at least 4.5:1, and a minimum 44 px touch target. Run `axe` checks in Playwright and test with VoiceOver or TalkBack.
- [ ] Error handling: a friendly recovery page if the database fails to open, with an export-and-reset option.

**Done when:** I can export, clear the site's data in browser settings, reload, and import my data back intact.
**Explain to me:** why accessibility labels matter and how they're tested, and why an import needs a preview step.

### Milestone 8 — Monetisation (RevenueCat Web Billing)

- [ ] `purchases/` wrapper with a `FakePurchases` implementation for development, so I can test both free and Pro without real payments. A dev-only switch flips between them.
- [ ] Paywall page: the benefits, monthly/yearly/lifetime options, the yearly saving shown clearly, restore purchases, and links to terms and privacy. No dark patterns.
- [ ] Enforce free limits via `core/limits.ts`: 3 active habits, no themes, no export, no freezes. Show the paywall when a limit is hit, with a clear reason.
- [ ] Handle: payment cancelled, payment failed, offline (Pro status is cached so Pro keeps working offline), restore with no purchases, and subscription expired while over the limit (read-only, never delete).
- [ ] Set up Stripe and RevenueCat Web Billing products, using Stripe's test mode. **Read RevenueCat's current Web Billing docs with me before writing code** — the setup steps change.
- [ ] **Decide with me how people restore Pro on a new device** with no account. RevenueCat Web Billing identifies buyers by email; we need a "restore by email" flow or a minimal sign-in. This is the one place "no account" gets tricky.

**Done when:** I can complete a Stripe test-mode purchase at the live URL and see Pro features unlock.
**Explain to me:** how web subscriptions work, what RevenueCat and Stripe each do, and why the fake implementation speeds up development.

### Milestone 9 — Ship it

- [ ] Custom domain (e.g. `streakly.app`) pointed at the host, with HTTPS.
- [ ] Final manifest, app icons (including a maskable icon and an Apple touch icon), and social share images (Open Graph).
- [ ] A simple landing page at `/` for new visitors (what it is, screenshots, "Open Streakly"), with the app itself at `/app`.
- [ ] Lighthouse check: Performance, Accessibility, Best Practices and PWA all green.
- [ ] Test on real devices: iPhone Safari (installed and not), Android Chrome, and desktop Chrome, Safari and Firefox.
- [ ] Privacy: the app stores data on the device; RevenueCat and Stripe process payments. Write a privacy policy and terms page.
- [ ] Add error reporting (e.g. Sentry) — ask me first, since it affects the privacy policy.
- [ ] Optional later: package the PWA for Google Play with a Trusted Web Activity (Bubblewrap/PWABuilder). Plan separately.
- [ ] Version 1.0.0, a CHANGELOG, and a release checklist for future updates.

**Done when:** Streakly is live at its own domain and people can pay for Pro.
**Explain to me:** what a CDN and static hosting are, how service worker caching affects releasing updates, and what Lighthouse measures.

---

## 7. Final Review (after Milestone 9)

Claude, please do these three things:

1. Review the codebase: find any rules that leaked out of `core/`, any hard-coded colours or spacing outside the theme, and any bugs. List findings by severity before fixing.
2. Suggest 5 changes most likely to improve day-7 retention and free-to-paid conversion.
3. Quiz me with 10 questions about how the app works, then correct my answers.

## 8. Stretch Goals (plan separately)

- **Web push reminders** (needs a small server and push subscriptions, so it changes the "no server" story).
- **Cloud sync** as a separate Pro tier (needs accounts and a backend).
- **Accountability partners** (needs a backend, so it changes the offline-only privacy story).
- **Native app stores** later: wrap the PWA (Trusted Web Activity for Android), or port to Expo reusing `src/core/` unchanged.
- **Apple Health / Google Fit** — not available to web apps; only possible after a native port.
