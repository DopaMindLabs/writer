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
