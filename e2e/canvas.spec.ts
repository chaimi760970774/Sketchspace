
import { test, expect } from '@playwright/test';
import { canvasContainsColor, canvasStage, createCanvas, drawStroke } from './helpers';

test('create a board, open its URL, and reload it', async ({ page }) => {
  const canvasId = await createCanvas(page);
  expect(canvasId).toMatch(/^[a-f\d]{24}$/i);

  const boardUrl = page.url();
  await expect(await canvasStage(page)).toBeVisible();

  await page.goto(boardUrl);
  await expect(page).toHaveURL(boardUrl);
  await expect(await canvasStage(page)).toBeVisible();
  await expect(page.locator('button.canvas-name')).toBeVisible();
});

test('a drawing is saved and survives a page reload', async ({ page }) => {
  await createCanvas(page);
  await expect(await canvasStage(page)).toBeVisible();
  await drawStroke(page);

  await expect(page.getByText('All changes saved')).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => canvasContainsColor(page, '#ff00ff')).toBe(true);
  await page.reload();
  await expect(await canvasStage(page)).toBeVisible();
  await expect.poll(() => canvasContainsColor(page, '#ff00ff')).toBe(true);
});

test('the canvas editor fills and erases a shape', async ({ page }) => {
  await createCanvas(page);
  const stage = await canvasStage(page);
  await expect(stage).toBeVisible();

  const fillColor = '#27ae60';
  await page.locator('input.fill-color').fill(fillColor);
  await page.getByRole('button', { name: 'Add circle' }).click();
  await page.getByRole('button', { name: 'Fill', exact: true }).click();
  await expect.poll(() => canvasContainsColor(page, fillColor)).toBe(true);

  const bounds = await stage.boundingBox();
  if (!bounds) throw new Error('The drawing stage has no visible bounds');
  await page.getByRole('button', { name: 'Eraser' }).click();
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await expect.poll(() => canvasContainsColor(page, fillColor)).toBe(false);
});

test('rename a canvas and export it as a PNG', async ({ page }) => {
  const originalName = `E2E rename ${Date.now()}`;
  await createCanvas(page, originalName);

  const renamed = `E2E renamed ${Date.now()}`;
  await page.getByRole('button', { name: originalName }).click();
  const nameInput = page.getByRole('textbox', { name: 'Canvas name' });
  await nameInput.fill(renamed);
  await nameInput.press('Enter');
  await expect(page.getByRole('button', { name: renamed })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: renamed })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('sketchspace.png');
});
