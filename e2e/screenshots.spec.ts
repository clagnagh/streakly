// `npm run screenshots`: saves every page at phone and desktop width, light and
// dark, into screenshots/ (not committed). Used for design review rounds.

import { test } from '@playwright/test';
import { pages } from './pages.ts';

const viewports = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
];

for (const vp of viewports) {
  for (const scheme of ['light', 'dark'] as const) {
    for (const page of pages) {
      test(`${page.name} ${vp.name} ${scheme}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
          colorScheme: scheme,
          isMobile: vp.name === 'phone',
        });
        const tab = await context.newPage();
        await tab.goto(page.path);
        await tab.getByRole('heading', { level: 1 }).waitFor();
        await tab.screenshot({
          path: `screenshots/${page.name}-${vp.name}-${scheme}.png`,
          fullPage: true,
        });
        await context.close();
      });
    }
  }
}
