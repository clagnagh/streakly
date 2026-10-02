import { expect, test, type Page } from '@playwright/test';

// Fixed time and place: Wednesday 30 September 2026, 10:00 in London.
test.use({ timezoneId: 'Europe/London', locale: 'en-GB' });

async function start(page: Page, time = '2026-09-30T10:00:00+01:00') {
  await page.clock.install({ time: new Date(time) });
  page.on('dialog', (d) => void d.accept());
  await page.goto('#/');
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
}

async function addHabit(page: Page, name: string, count?: { target: number; unit: string }) {
  await page.goto('#/habit/new');
  await page.getByLabel('Name').fill(name);
  if (count) {
    await page.getByRole('button', { name: 'Count up to a target' }).click();
    await page.getByLabel('Target').fill(String(count.target));
    await page.getByLabel('Unit').fill(count.unit);
  }
  await page.getByRole('button', { name: 'Add habit' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
}

const row = (page: Page, name: string) =>
  page.locator(`[data-testid="today-row"][data-habit="${name}"]`);

test('create a habit, complete it, reload: still complete', async ({ page }) => {
  await start(page);
  await expect(page.getByText('Start with one small habit')).toBeVisible();
  await addHabit(page, 'Meditate');

  await page.getByRole('button', { name: 'Meditate: not done' }).click();
  await expect(page.getByRole('button', { name: 'Meditate: done' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('day-progress')).toContainText('1 of 1 done');
  await expect(row(page, 'Meditate')).toContainText('1-day streak');

  await page.reload();
  await expect(page.getByRole('button', { name: 'Meditate: done' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('count habits step up to their target and back down', async ({ page }) => {
  await start(page);
  await addHabit(page, 'Water', { target: 3, unit: 'glasses' });
  const more = page.getByRole('button', { name: 'One more glasses' });
  await more.click();
  await more.click();
  await expect(row(page, 'Water')).toContainText('2 / 3');
  await expect(page.getByTestId('day-progress')).toContainText('0 of 1 done');
  await more.click();
  await expect(page.getByTestId('day-progress')).toContainText('1 of 1 done');
  await page.getByRole('button', { name: 'One less glasses' }).click();
  await expect(row(page, 'Water')).toContainText('2 / 3');
  await page.reload();
  await expect(row(page, 'Water')).toContainText('2 / 3');
});

test('editing past days on the detail page updates the streak', async ({ page }) => {
  await start(page);
  await addHabit(page, 'Read');
  await page.getByRole('link', { name: /Read/ }).click();
  await expect(page.getByTestId('current-streak')).toHaveText('0 days');

  const selected = page.getByTestId('selected-day');
  await page.getByRole('button', { name: /29 Sept: not done/ }).click();
  await selected.getByRole('button', { name: 'Read: not done' }).click();
  await page.getByRole('button', { name: /28 Sept: not done/ }).click();
  await selected.getByRole('button', { name: 'Read: not done' }).click();
  // Today isn't done yet, and that doesn't break the streak.
  await expect(page.getByTestId('current-streak')).toHaveText('2 days');

  await page.getByRole('button', { name: /30 Sept: not done/ }).click();
  await selected.getByRole('button', { name: 'Read: not done' }).click();
  await expect(page.getByTestId('current-streak')).toHaveText('3 days');
  await expect(page.getByTestId('best-streak')).toHaveText('3 days');

  await page.getByRole('link', { name: 'Today' }).click();
  await expect(row(page, 'Read')).toContainText('3-day streak');
});

test('a tab left open overnight moves to the new day', async ({ page }) => {
  await start(page, '2026-09-30T22:00:00+01:00');
  await addHabit(page, 'Stretch');
  await page.getByRole('button', { name: 'Stretch: not done' }).click();
  await expect(page.getByText('Wednesday 30 September')).toBeVisible();

  // 2:30 a.m.: still Wednesday, because the day starts at 4 a.m.
  await page.clock.setSystemTime(new Date('2026-10-01T02:30:00+01:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('Wednesday 30 September')).toBeVisible();

  await page.clock.setSystemTime(new Date('2026-10-01T09:00:00+01:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('Thursday 1 October')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stretch: not done' })).toBeVisible();
  await expect(row(page, 'Stretch')).toContainText('1-day streak');
});

test('reorder, archive and restore habits', async ({ page }) => {
  await start(page);
  await addHabit(page, 'Alpha');
  await addHabit(page, 'Beta');
  await page.getByRole('link', { name: 'Habits' }).click();
  const names = () => page.getByTestId('habit-row').locator('a').allInnerTexts();
  await expect
    .poll(names)
    .toEqual([expect.stringContaining('Alpha'), expect.stringContaining('Beta')]);

  // Keyboard users: the arrow buttons appear when focused, and Enter presses them.
  await page.getByRole('button', { name: 'Move Beta up' }).focus();
  await expect(page.getByRole('button', { name: 'Move Beta up' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect
    .poll(names)
    .toEqual([expect.stringContaining('Beta'), expect.stringContaining('Alpha')]);
  await page.reload();
  await expect
    .poll(names)
    .toEqual([expect.stringContaining('Beta'), expect.stringContaining('Alpha')]);

  await page
    .getByTestId('habit-row')
    .filter({ hasText: 'Alpha' })
    .getByRole('button', { name: 'Archive' })
    .click();
  await expect(page.getByTestId('archived-row')).toContainText('Alpha');
  await page.getByRole('link', { name: 'Today' }).click();
  await expect(row(page, 'Alpha')).toHaveCount(0);

  await page.getByRole('link', { name: 'Habits' }).click();
  await page.getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByTestId('archived-row')).toHaveCount(0);
});

test('drag to reorder with the handle', async ({ page }) => {
  await start(page);
  await addHabit(page, 'First');
  await addHabit(page, 'Second');
  await page.getByRole('link', { name: 'Habits' }).click();
  const handle = page.getByRole('button', { name: 'Drag to reorder Second' });
  // Wait until the page transition has finished and the handle can be touched.
  await handle.hover();
  const target = page.getByTestId('habit-row').first();
  const from = (await handle.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, to.y + to.height / 3, { steps: 5 });
  await page.mouse.up();
  const names = () => page.getByTestId('habit-row').locator('a').allInnerTexts();
  await expect
    .poll(names)
    .toEqual([expect.stringContaining('Second'), expect.stringContaining('First')]);
});

test('the form explains what is missing, and delete asks first', async ({ page }) => {
  await start(page);
  await page.goto('#/habit/new');
  await page.getByRole('button', { name: 'Add habit' }).click();
  await expect(page.getByText('Give your habit a name.')).toBeVisible();

  await addHabit(page, 'Temporary');
  await page.getByRole('link', { name: /Temporary/ }).click();
  await page.getByRole('link', { name: 'Edit habit' }).click();
  await page.getByRole('button', { name: 'Delete' }).click(); // dialog auto-accepted
  await expect(page.getByText('No habits yet')).toBeVisible();
});
