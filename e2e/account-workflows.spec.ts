import { test, expect } from '@playwright/test';
import { createCanvas, deleteTestAccount, newTestAccount, registerTestAccount, submitLogin } from './helpers';


test('sign up, reject a wrong password, log in, then delete the account', async ({ page }) => {
  const account = newTestAccount();
  let accountCreated = false;

  try {
    await registerTestAccount(page, account, () => { accountCreated = true; });
    await expect(page.getByRole('button', { name: 'My Work' })).toBeVisible();

    await page.goto('/#/login');
    await page.getByText('Log in', { exact: true }).click();
    await submitLogin(page, account.email, 'wrong123');
    const feedback = page.getByRole('alert');
    await expect(feedback).toBeVisible();
    await expect(feedback).not.toHaveText('');

    await submitLogin(page, account.email, account.password);
    await expect(page).toHaveURL(/#\/(gallery)?$/);
    await expect(page.getByRole('button', { name: 'My Work' })).toBeVisible();
  } finally {
    if (accountCreated) await deleteTestAccount(page, account);
  }
});

test('sign up, log in, update the profile, and clean up the test account', async ({ page }) => {
  const account = newTestAccount();
  let accountCreated = false;

  try {
    await registerTestAccount(page, account, () => { accountCreated = true; });
    await expect(page.getByRole('button', { name: 'My Work' })).toBeVisible();

    await page.goto('/#/profile');
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/#\/login$/);
    await page.getByText('Log in', { exact: true }).click();
    await submitLogin(page, account.email, account.password);
    await expect(page).toHaveURL(/#\/(gallery)?$/);

    await page.goto('/#/profile');
    const updatedName = `${account.displayName} Updated`;
    await page.getByRole('button', { name: 'Modify' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill(updatedName);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('.profile-name')).toHaveText(updatedName);

    await page.reload();
    await expect(page.locator('.profile-name')).toHaveText(updatedName);
  } finally {
    if (accountCreated) await deleteTestAccount(page, account);
  }
});

test('change the profile photo and keep it after reload', async ({ page }) => {
  const account = newTestAccount();
  let accountCreated = false;
  try {
    await registerTestAccount(page, account, () => { accountCreated = true; });
    await page.goto('/#/profile');

    const pngBase64 = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas context is unavailable');
      context.fillStyle = '#1f8a70';
      context.fillRect(0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png').split(',')[1];
    });

    await page.locator('input[type="file"][accept*="image/png"]').setInputFiles({
      name: 'e2e-avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from(pngBase64, 'base64'),
    });
    await expect(page.locator('img.profile-avatar')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Profile photo updated')).toBeVisible();

    await page.reload();
    await expect(page.locator('img.profile-avatar')).toBeVisible();
  } finally {
    if (accountCreated) await deleteTestAccount(page, account);
  }
});

test('move a canvas into a folder', async ({ page }) => {
  const account = newTestAccount();
  let accountCreated = false;
  try {
    await registerTestAccount(page, account, () => { accountCreated = true; });
    await page.goto('/#/mywork');

    const folderName = `E2E folder ${Date.now()}`;
    await page.locator('button.folder-add[title="New folder"]').click();
    const folderInput = page.getByRole('textbox', { name: 'New folder name' });
    await folderInput.fill(folderName);
    await folderInput.press('Enter');
    const folderTab = page.getByRole('button', { name: folderName });
    await expect(folderTab).toBeVisible();

    const canvasName = `E2E filed canvas ${Date.now()}`;
    await createCanvas(page, canvasName);
    await page.goto('/#/mywork');
    const canvasCard = page.locator('.card-item').filter({ hasText: canvasName });
    await expect(canvasCard).toBeVisible();
    await canvasCard.dragTo(folderTab);

    await folderTab.click();
    await expect(page.locator('.card-item').filter({ hasText: canvasName })).toBeVisible();
  } finally {
    if (accountCreated) await deleteTestAccount(page, account);
  }
});
