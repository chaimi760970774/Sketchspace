import { test, expect } from '@playwright/test';


test('loads the app without a fatal page error', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toBeEmpty();

  await expect(page.getByRole('heading', { name: 'Making Collage Together!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'gallery' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start doodling' })).toBeVisible();

  expect(pageErrors, `Unexpected browser errors:\n${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `Unexpected console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});

test('main route navigation responds', async ({ page }) => {
  await page.goto('/');
  const gallery = page.getByTestId('gallery-link')
    .or(page.getByRole('link', { name: /gallery/i }))
    .or(page.getByRole('button', { name: /gallery/i }));

  test.skip(!(await gallery.count()), 'Add a gallery-link test id or accessible Gallery control.');
  await gallery.first().click();
  await expect(page).toHaveURL(/gallery/i);
});
