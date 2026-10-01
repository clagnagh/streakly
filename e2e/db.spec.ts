import { expect, test, type Page } from '@playwright/test';

// Each test gets a fresh browser profile, so the database starts empty.

async function openDbPage(page: Page) {
  page.on('dialog', (d) => void d.accept()); // auto-confirm "Load sample data?" etc.
  await page.goto('#/dev/db');
  await expect(page.getByTestId('schema-version')).toHaveText('1');
}

test('sample data loads and survives a page reload', async ({ page }) => {
  await openDbPage(page);
  await expect(page.getByTestId('count-habits')).toHaveText('0');

  await page.getByRole('button', { name: 'Load sample data' }).click();
  await expect(page.getByTestId('count-habits')).toHaveText('5');
  const completions = await page.getByTestId('count-completions').textContent();
  expect(Number(completions)).toBeGreaterThan(200);

  await page.reload();
  await expect(page.getByTestId('count-habits')).toHaveText('5');
  await expect(page.getByTestId('count-completions')).toHaveText(completions!);
});

test('the SQL box answers SELECTs and refuses changes', async ({ page }) => {
  await openDbPage(page);
  await page.getByRole('button', { name: 'Load sample data' }).click();
  await expect(page.getByTestId('count-habits')).toHaveText('5');

  const box = page.getByRole('textbox', { name: 'SQL query' });
  await box.fill("SELECT name FROM habits WHERE schedule_kind = 'daily'");
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByTestId('row-count')).toHaveText('2 rows');
  await expect(page.getByRole('cell', { name: 'Drink water' })).toBeVisible();

  await box.fill('DELETE FROM habits');
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByRole('alert')).toContainText('Only SELECT');
  await page.getByRole('button', { name: 'Clear everything' }).waitFor();
  await page.reload();
  await expect(page.getByTestId('count-habits')).toHaveText('5');
});

test('clear everything empties the database', async ({ page }) => {
  await openDbPage(page);
  await page.getByRole('button', { name: 'Load sample data' }).click();
  await expect(page.getByTestId('count-habits')).toHaveText('5');
  await page.getByRole('button', { name: 'Clear everything' }).click();
  await expect(page.getByTestId('count-habits')).toHaveText('0');
  await expect(page.getByTestId('count-completions')).toHaveText('0');
});

test('only one tab uses the database; "Use it here" moves it', async ({ context }) => {
  const first = await context.newPage();
  await openDbPage(first);
  await first.getByRole('button', { name: 'Load sample data' }).click();
  await expect(first.getByTestId('count-habits')).toHaveText('5');

  const second = await context.newPage();
  second.on('dialog', (d) => void d.accept());
  await second.goto('#/dev/db');
  await expect(
    second.getByRole('heading', { name: 'Streakly is open in another tab' }),
  ).toBeVisible();

  await second.getByRole('button', { name: 'Use it here' }).click();
  await expect(second.getByTestId('count-habits')).toHaveText('5');
  await expect(first.getByRole('heading', { name: 'Streakly moved to another tab' })).toBeVisible();

  // And back again.
  await first.getByRole('button', { name: 'Use it here' }).click();
  await expect(first.getByTestId('count-habits')).toHaveText('5');
  await expect(
    second.getByRole('heading', { name: 'Streakly moved to another tab' }),
  ).toBeVisible();
});

test('Settings says whether the browser will keep the data', async ({ page }) => {
  await page.goto('#/settings');
  await expect(page.getByTestId('storage-status')).toBeVisible();
});
