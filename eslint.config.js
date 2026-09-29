import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

// A hex colour anywhere in a string, e.g. '#fff' or 'solid #1F6F6B'.
const HEX = '/#[0-9a-fA-F]{3,8}\\b/';

export default tseslint.config(
  { ignores: ['dist', 'playwright-report', 'test-results', 'screenshots'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat.recommended,
  },
  {
    files: ['*.config.ts', 'tests/**', 'e2e/**'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Working Agreement rule 6: colours come from src/theme only.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/theme/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${HEX}]`,
          message: 'No raw colours: use a theme token, e.g. vars.color.accent.',
        },
        {
          selector: `TemplateElement[value.raw=${HEX}]`,
          message: 'No raw colours: use a theme token, e.g. vars.color.accent.',
        },
      ],
    },
  },

  // Working Agreement rule 5: src/core is pure logic. No React, no database,
  // no browser APIs, and no hidden clock or randomness ("today" is passed in).
  {
    files: ['src/core/**/*.{ts,tsx}'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'react/*', 'react-dom/*', 'react-router/*'],
              message: 'src/core must not use React. Put UI code in src/components or src/routes.',
            },
            {
              group: ['zustand', 'zustand/*', '@sqlite.org/*', 'workbox-*', '@revenuecat/*'],
              message: 'src/core must not use storage, state or services. Pass data in instead.',
            },
            {
              group: [
                '**/db',
                '**/db/**',
                '**/store',
                '**/store/**',
                '**/components/**',
                '**/routes/**',
                '**/theme',
                '**/theme/**',
                '**/purchases/**',
                '**/reminders/**',
                '**/backup/**',
              ],
              message: 'src/core may only import other files in src/core.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'navigator',
          'localStorage',
          'sessionStorage',
          'indexedDB',
          'fetch',
          'location',
          'self',
        ].map((name) => ({
          name,
          message: `src/core must not use ${name}. Pass the value in as an argument.`,
        })),
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'src/core must not read the clock. Take `now` or `today` as an argument.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'src/core must not read the clock. Take `now` or `today` as an argument.',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'src/core must not use Math.random(). Pass randomness in.',
        },
      ],
    },
  },
);
