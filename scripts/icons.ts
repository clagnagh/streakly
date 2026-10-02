// Draws the app icons (PNG) from the SVG logo, using the Chromium that
// Playwright already has, so no image library is needed.
//   npm run icons      (then commit public/icons/*.png)
//
// - icon-192 / icon-512: rounded square, for browsers and Android.
// - maskable-512: edge-to-edge background with the tick inside the "safe
//   zone" (the middle 80%), because Android crops icons into circles,
//   squircles and more.
// - apple-touch-icon (180): square with no rounding; iOS rounds it itself.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { light } from '../src/theme/themes.ts';

const BG = light.color.accent;
const FG = light.color.onAccent;
const TICK = 'M19 33.5l8.5 8.5L45 24.5';

const svg = ({ rounded, tickScale }: { rounded: boolean; tickScale: number }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <rect width="64" height="64" rx="${rounded ? 14 : 0}" fill="${BG}"/>
  <g transform="translate(32 32) scale(${tickScale}) translate(-32 -32)">
    <path d="${TICK}" fill="none" stroke="${FG}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

const icons = [
  { file: 'icon-192.png', size: 192, rounded: true, tickScale: 1 },
  { file: 'icon-512.png', size: 512, rounded: true, tickScale: 1 },
  { file: 'maskable-512.png', size: 512, rounded: false, tickScale: 0.75 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, tickScale: 0.85 },
];

mkdirSync('public/icons', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
for (const icon of icons) {
  const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg(icon)}</body></html>`,
  );
  await page.screenshot({ path: `public/icons/${icon.file}`, omitBackground: true });
  await page.close();
  console.log('wrote', icon.file);
}
await browser.close();
