import { test, expect, type BrowserContext } from '@playwright/test';
import { canvasContainsColor, canvasStage, createCanvas, drawStroke } from './helpers';

test('two independent browser sessions see synchronized board changes', async ({ page, browser }) => {
  const contextB: BrowserContext = await browser.newContext();
  try {
    const canvasName = `E2E collaboration ${Date.now()}`;
    const canvasId = await createCanvas(page, canvasName);
    await page.getByRole('button', { name: /^share$/i }).click();
    const shareDialog = page.getByRole('dialog', { name: /share this canvas/i });
    await expect(shareDialog).toBeVisible();
    await expect(shareDialog.getByRole('textbox', { name: 'Canvas id' })).toHaveValue(canvasId);
    await shareDialog.getByRole('button', { name: 'Close' }).click();

    const secondPage = await contextB.newPage();
    await secondPage.goto(new URL(`#/canvas/${canvasId}`, page.url()).toString());
    await expect(await canvasStage(secondPage)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.collaborators')).toContainText('people drawing here', { timeout: 15_000 });

    await drawStroke(page, '#ff00ff');
    await expect.poll(() => canvasContainsColor(secondPage, '#ff00ff'), { timeout: 15_000 }).toBe(true);
  } finally {
    await contextB.close();
  }
});
