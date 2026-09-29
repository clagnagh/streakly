# src/core — pure habit rules

Everything that decides _what's due_ and _what counts as a streak_ lives here, so it can be
tested without a browser.

Files here must not:

- import React, the database, the store, the theme, or any service;
- use browser globals (`window`, `document`, `navigator`, `localStorage`, `fetch`…);
- read the clock (`Date.now()`, `new Date()`) or use `Math.random()`.

"Today" and "now" are always passed in as arguments. ESLint enforces all of this
(`eslint.config.js`); never switch the rule off to make lint pass.

Imports between core files end in `.ts` (`./dates.ts`).
