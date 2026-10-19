import { expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Prefer data-testid selectors for controls that are hard to locate accessibly.
 * These fallbacks make the initial scaffold easier to adapt to the current UI.
 */
export async function enterAsGuest(page: Page) {
  await page.goto('/');
  const guestButton = page.getByTestId('guest-login')
    .or(page.getByRole('button', { name: /continue as guest|guest/i }));

  if (await guestButton.count()) {
    await guestButton.first().click();
  }
}

export async function openLogin(page: Page) {
  await page.goto('/#/profile');
  await page.getByRole('button', { name: /log in or sign up/i }).click();
  await expect(page.locator('input[autocomplete="email"]')).toBeVisible();
}

export async function submitLogin(page: Page, email: string, password: string) {
  await page.locator('input[autocomplete="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /^login$/i }).click();
}

export async function loginAsE2EUser(page: Page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error('E2E_EMAIL and E2E_PASSWORD are required');

  await openLogin(page);
  await submitLogin(page, email, password);
  await expect(page).toHaveURL(/#\/(gallery)?$/);
}

export interface TestAccount {
  email: string;
  password: string;
  displayName: string;
}

export function newTestAccount(): TestAccount {
  const suffix = randomUUID();
  return {
    email: `sketchspace-e2e-${suffix}@example.com`,
    password: `E2e-${suffix}-9`,
    displayName: `E2E ${suffix.slice(0, 12)}`,
  };
}

export async function registerTestAccount(
  page: Page,
  account: TestAccount,
  onCreated: () => void,
): Promise<void> {
  await page.goto('/#/login');
  await page.getByText('Sign up', { exact: true }).click();
  await page.locator('input[autocomplete="nickname"]').fill(account.displayName);
  await page.locator('input[autocomplete="email"]').fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);

  const registrationResponse = page.waitForResponse(response =>
    response.url().includes('/api/auth/register') && response.request().method() === 'POST'
  );
  let requestFailure = 'unknown network failure';
  const captureFailure = (request: import('@playwright/test').Request) => {
    if (request.url().includes('/api/auth/register')) {
      requestFailure = request.failure()?.errorText ?? requestFailure;
    }
  };
  page.on('requestfailed', captureFailure);
  await page.getByRole('button', { name: /^sign up$/i }).click();
  const responseOrError = await Promise.race([
    registrationResponse.then(response => ({ response })),
    page.getByRole('alert').waitFor({ state: 'visible', timeout: 10_000 }).then(async () => ({
      error: await page.getByRole('alert').innerText(),
    })),
  ]);
  page.off('requestfailed', captureFailure);
  if ('error' in responseOrError) {
    throw new Error(`Signup failed: ${responseOrError.error} (${requestFailure})`);
  }
  const response = responseOrError.response;
  if (response.ok()) onCreated();
  expect(response.ok(), 'Registration API should accept fresh test data').toBe(true);
  await expect(page).toHaveURL(/#\/(gallery)?$/);
}

export async function deleteTestAccount(page: Page, account: TestAccount): Promise<void> {
  await page.goto('/#/profile');
  const deleteButton = page.getByRole('button', { name: 'Delete account' });
  if (!(await deleteButton.count())) {
    await page.goto('/#/login');
    await submitLogin(page, account.email, account.password);
    await expect(page).toHaveURL(/#\/(gallery)?$/);
    await page.goto('/#/profile');
  }

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete account' }).click();
  await expect(page).toHaveURL(/#\/login$/);
}

export async function openGallery(page: Page) {
  const gallery = page.getByTestId('gallery-link')
    .or(page.getByRole('link', { name: /gallery/i }))
    .or(page.getByRole('button', { name: /gallery/i }));
  if (await gallery.count()) await gallery.first().click();
}

export async function createCanvas(page: Page, name = `E2E canvas ${Date.now()}`) {
  await page.goto('/#/gallery');
  await page.getByRole('button', { name: /start doodling/i }).click();
  await expect(page).toHaveURL(/#\/canvas\/[a-f\d]{24}$/i, { timeout: 15_000 });
  await page.getByRole('button', { name: /^untitled$/i }).click();
  const nameInput = page.getByRole('textbox', { name: 'Canvas name' });
  await nameInput.fill(name);
  await nameInput.press('Enter');
  await expect(page.getByRole('button', { name })).toBeVisible();
  return page.url().match(/#\/canvas\/([a-f\d]{24})/i)?.[1] ?? '';
}

export async function canvasStage(page: Page) {
  return page.getByTestId('canvas-stage')
    .or(page.locator('.konva-stage').first());
}

export async function drawStroke(page: Page, color = '#ff00ff') {
  await page.getByRole('button', { name: /^stroke$/i }).click();
  await page.locator('input[type="color"]').fill(color);
  const stage = await canvasStage(page);
  const box = await stage.boundingBox();
  if (!box) throw new Error('The drawing stage has no visible bounds');

  const startX = box.x + box.width * 0.25;
  const startY = box.y + box.height * 0.35;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 35, startY + 22, { steps: 5 });
  await page.mouse.move(startX + 75, startY + 5, { steps: 5 });
  await page.mouse.up();
}

export async function canvasContainsColor(page: Page, expectedColor: string) {
  const expected = expectedColor.match(/[\da-f]{2}/gi)?.map((part) => parseInt(part, 16)) ?? [];
  if (expected.length !== 3) throw new Error(`Invalid RGB color: ${expectedColor}`);

  return page.locator('.konva-stage canvas').evaluateAll((canvases, rgb) => {
    return canvases.some((element) => {
      if (!(element instanceof HTMLCanvasElement)) return false;
      const canvas = element;
      const context = canvas.getContext('2d');
      if (!context) return false;
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] === rgb[0] && pixels[index + 1] === rgb[1] && pixels[index + 2] === rgb[2] && pixels[index + 3] > 0) {
          return true;
        }
      }
      return false;
    });
  }, expected);
}
