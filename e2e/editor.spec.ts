import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('typed content appears in the Lexical editor and persists across navigation', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);

  const editor = page.locator('[aria-label="Document body"]');
  await expect(editor).toBeVisible();

  const probe = `e2e probe ${Date.now()}`;
  await editor.click();
  await page.keyboard.type(probe);
  await expect(editor).toContainText(probe);

  // Autosave debounce is 600ms — wait long enough for it to flush to IndexedDB.
  await page.waitForTimeout(1000);

  // Navigate away then back; content should rehydrate from Dexie.
  await page.goto('/#/about');
  await expect(page.getByRole('heading', { name: 'Hi,' })).toBeVisible();
  await page.goto(`/#/s/${spaceId}`);

  await expect(page.locator('[aria-label="Document body"]')).toContainText(probe);
});

test('renames a doc by double-clicking its name in the topbar breadcrumb', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);

  // The first-loaded doc varies because Dexie's primary-key order isn't
  // insertion order. Click the seeded "Abstract" sidebar link to be explicit.
  await page.getByRole('link', { name: /^Abstract/ }).click();

  const header = page.locator('header').first();
  const docNameButton = header.getByRole('button', { name: 'Abstract' });
  await expect(docNameButton).toBeVisible();

  await docNameButton.dblclick();

  const renameInput = header.getByRole('textbox', { name: /Rename doc/i });
  await expect(renameInput).toBeVisible();
  await expect(renameInput).toBeFocused();

  const newName = `Renamed ${Date.now()}`;
  await renameInput.fill(newName);
  await renameInput.press('Enter');

  await expect(header.getByRole('button', { name: newName })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(newName) })).toBeVisible();

  // Persists after navigation away and back.
  const docUrl = page.url();
  await page.goto('/#/about');
  await expect(page.getByRole('heading', { name: 'Hi,' })).toBeVisible();
  await page.goto(docUrl);
  await expect(page.locator('header').first().getByRole('button', { name: newName })).toBeVisible();
});

test('Escape cancels a doc rename in the topbar', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.getByRole('link', { name: /^Abstract/ }).click();

  const header = page.locator('header').first();
  const docNameButton = header.getByRole('button', { name: 'Abstract' });
  await docNameButton.dblclick();

  const renameInput = header.getByRole('textbox', { name: /Rename doc/i });
  await renameInput.fill('Should not stick');
  await renameInput.press('Escape');

  await expect(header.getByRole('button', { name: 'Abstract' })).toBeVisible();
});
