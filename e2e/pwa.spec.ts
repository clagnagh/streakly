import { expect, test, type Page } from '@playwright/test';

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' });

async function addHabit(page: Page, name: string, reminder?: string) {
  await page.goto('#/habit/new');
  await page.getByLabel('Name').fill(name);
  if (reminder) await page.getByLabel(/Reminder/).fill(reminder);
  await page.getByRole('button', { name: 'Add habit' }).click();
  // The first reminder shows the notification explainer; later ones go straight to Today.
  const ask = page.getByRole('dialog', { name: 'Want a gentle nudge?' });
  const today = page.getByRole('heading', { level: 1, name: 'Today' });
  await expect(ask.or(today)).toBeVisible();
  if (await ask.isVisible()) await ask.getByRole('button', { name: 'No thanks' }).click();
  await expect(today).toBeVisible();
}

const card = (page: Page, name: string) =>
  page.locator(`[data-testid="today-row"][data-habit="${name}"]`);

test('after the first visit, Streakly opens with no network (airplane mode)', async ({
  page,
  context,
}) => {
  await page.goto('#/');
  await addHabit(page, 'Meditate');
  await page.getByRole('button', { name: 'Meditate: not done' }).click();

  // Wait for the service worker to finish saving every file for offline use.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Meditate: done' })).toBeVisible();

  // Pages, the font and the database all still work offline.
  await page.getByRole('link', { name: 'Habits' }).click();
  await expect(page.getByTestId('habit-row')).toHaveCount(1);
});

test('the web manifest describes an installable app, and every icon loads', async ({ page }) => {
  await page.goto('#/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const res = await page.request.get(new URL(href!, page.url()).href);
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ name: 'Streakly', display: 'standalone', start_url: './' });
  const purposes = manifest.icons.map((i: { purpose?: string }) => i.purpose ?? 'any');
  expect(purposes).toContain('maskable');
  for (const icon of [...manifest.icons, { src: 'icons/apple-touch-icon.png' }]) {
    const r = await page.request.get(new URL(icon.src, new URL(href!, page.url())).href);
    expect(r.ok(), icon.src).toBe(true);
  }
});

test('a passed reminder gently highlights the habit until it is done', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-02T09:00:00+01:00') });
  await page.goto('#/');
  await addHabit(page, 'Stretch', '08:30');
  await addHabit(page, 'Read', '10:00');

  await expect(card(page, 'Stretch')).toHaveAttribute('data-reminder', 'true');
  await expect(card(page, 'Stretch')).toContainText("08:30 · when you're ready");
  await expect(card(page, 'Read')).toHaveAttribute('data-reminder', 'false');

  await page.getByRole('button', { name: 'Stretch: not done' }).click();
  await expect(card(page, 'Stretch')).toHaveAttribute('data-reminder', 'false');

  // Later: 10:01, back to the app.
  await page.clock.setSystemTime(new Date('2026-10-02T10:01:00+01:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(card(page, 'Read')).toHaveAttribute('data-reminder', 'true');
});

test('the first reminder explains notifications before the browser asks, only once', async ({
  page,
}) => {
  await page.goto('#/habit/new');
  await page.getByLabel('Name').fill('Journal');
  await page.getByLabel(/Reminder/).fill('21:00');
  await page.getByRole('button', { name: 'Add habit' }).click();
  const ask = page.getByRole('dialog', { name: 'Want a gentle nudge?' });
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: 'No thanks' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  await expect(card(page, 'Journal')).toHaveCount(1); // saved once, not again by the dialog

  await page.goto('#/habit/new');
  await page.getByLabel('Name').fill('Walk');
  await page.getByLabel(/Reminder/).fill('18:00');
  await page.getByRole('button', { name: 'Add habit' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  await expect(ask).toHaveCount(0);
});

test('Settings explains reminders and shows notifications are on when allowed', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['notifications']);
  await page.goto('#/settings');
  await expect(page.getByRole('switch', { name: /Highlight habits/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByTestId('notification-state')).toHaveAttribute('data-state', 'granted');
  await expect(page.getByText("Web apps can't send notifications when they're")).toBeVisible();
});

test.describe('install card', () => {
  test('waits for a first completed habit, then offers the browser install', async ({ page }) => {
    await page.goto('#/');
    await addHabit(page, 'Meditate');
    // Pretend the browser said "this can be installed".
    await page.evaluate(() => {
      const e = Object.assign(new Event('beforeinstallprompt'), {
        prompt: async () => {},
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });
      window.dispatchEvent(e);
    });
    await expect(page.getByTestId('install-card')).toHaveCount(0); // nothing completed yet

    await page.getByRole('button', { name: 'Meditate: not done' }).click();
    const installCard = page.getByTestId('install-card');
    await expect(installCard).toBeVisible();
    await installCard.getByRole('button', { name: 'Install' }).click();
    await expect(installCard).toHaveCount(0);
  });

  test.describe('on iPhone', () => {
    test.use({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });

    test('shows Add to Home Screen steps, and "Got it" hides them', async ({ page }) => {
      await page.goto('#/');
      await addHabit(page, 'Meditate');
      await page.getByRole('button', { name: 'Meditate: not done' }).click();
      const installCard = page.getByTestId('install-card');
      await expect(installCard).toContainText('Add to Home Screen');
      await installCard.getByRole('button', { name: 'Got it' }).click();
      await expect(installCard).toHaveCount(0);
      await page.reload();
      await expect(page.getByRole('button', { name: 'Meditate: done' })).toBeVisible();
      await expect(installCard).toHaveCount(0);
    });
  });
});
