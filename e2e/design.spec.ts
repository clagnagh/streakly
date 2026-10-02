import { expect, test, type Page } from '@playwright/test';

async function addHabit(page: Page, name: string) {
  await page.goto('#/habit/new');
  await page.getByLabel('Name').fill(name);
  await page.getByRole('button', { name: 'Add habit' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
}

const bodyBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('choosing Dark in Settings sticks after a reload, and System follows the device', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('#/settings');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect.poll(() => bodyBackground(page)).toBe('rgb(26, 25, 23)');

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => bodyBackground(page)).toBe('rgb(26, 25, 23)');

  await page.getByRole('radio', { name: 'System' }).click();
  await expect.poll(() => bodyBackground(page)).toBe('rgb(250, 247, 242)');
});

test('the vibration switch can be turned off and stays off', async ({ page }) => {
  await page.goto('#/settings');
  const toggle = page.getByRole('switch', { name: 'Vibration on tap' });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Vibration on tap' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
});

test('desktop shows a sidebar; phones show a bottom tab bar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('#/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect.poll(async () => (await nav.boundingBox())?.height).toBe(800);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await nav.boundingBox())?.width).toBe(390);
});

test('with reduced motion, completing still works', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await addHabit(page, 'Calm');
  const motion = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--motion').trim(),
  );
  expect(motion).toBe('0');
  await page.getByRole('button', { name: 'Calm: not done' }).click();
  await expect(page.getByRole('button', { name: 'Calm: done' })).toBeVisible();
});

test('every button and tab is at least 44 px to tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await addHabit(page, 'Tiny');
  for (const path of ['#/', '#/habits', '#/settings', '#/habit/new']) {
    await page.goto(path);
    await page.getByRole('heading', { level: 1 }).waitFor();
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button, nav a, [role="switch"], [role="radio"]')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && (r.width < 44 || r.height < 44))
        .map(
          ({ el, r }) =>
            `${el.getAttribute('aria-label') ?? el.textContent}: ${r.width}×${r.height}`,
        ),
    );
    expect(small, path).toEqual([]);
  }
});
