import { expect, test } from '@playwright/test';
import { pages } from './pages.ts';

for (const page of pages) {
  test(`${page.name} loads without errors`, async ({ page: tab }) => {
    const errors: string[] = [];
    tab.on('pageerror', (e) => errors.push(e.message));
    tab.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await tab.goto(page.path);
    await expect(tab.getByRole('heading', { level: 1, name: page.heading })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('tab bar moves between pages', async ({ page }) => {
  await page.goto('#/');
  await page.getByRole('link', { name: 'Stats' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Stats' })).toBeVisible();
  await expect(page).toHaveURL(/#\/stats$/);
});

test('unknown pages show a friendly message', async ({ page }) => {
  await page.goto('#/nope');
  await expect(page.getByRole('heading', { name: 'Nothing here' })).toBeVisible();
});

test('dark mode follows the system setting', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('#/');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(26, 25, 23)');
});
