import { defineConfig, devices } from '@playwright/test';

// In Claude's cloud sandbox Chromium is pre-installed at a fixed path; set
// PLAYWRIGHT_CHROMIUM_PATH there. Everywhere else, Playwright uses its own
// browser (`npx playwright install chromium`).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/streakly/',
    launchOptions: { executablePath },
  },
  // Tests run against the real production build, the same files GitHub Pages serves.
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/streakly/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'smoke',
      testMatch: 'smoke.spec.ts',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
    {
      name: 'screenshots',
      testMatch: 'screenshots.spec.ts',
      use: { launchOptions: { executablePath } },
    },
  ],
});
