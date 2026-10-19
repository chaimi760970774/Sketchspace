import { test, expect } from '@playwright/test';
import { createCanvas } from './helpers';

test('a canvas can be shared and appears in the Gallery', async ({ page }) => {
  const name = `E2E shared ${Date.now()}`;
  const canvasId = await createCanvas(page, name);
  await page.getByRole('button', { name: /^share$/i }).click();

  const shareDialog = page.getByRole('dialog', { name: /share this canvas/i });
  await expect(shareDialog).toBeVisible();
  await expect(shareDialog.getByRole('textbox', { name: 'Canvas id' })).toHaveValue(canvasId);

  await shareDialog.getByRole('button', { name: 'Close' }).click();
  await page.goto('/#/gallery');
  await expect(page.locator('.card-item').filter({ hasText: name })).toBeVisible();
});
