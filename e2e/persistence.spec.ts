import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test('content typed into a doc survives a hard reload (IndexedDB persistence)', async ({ page }) => {
  await reseedAndGoHome(page);
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const docUrl = page.url();

  const editor = page.locator('[aria-label="Document body"]');
  await expect(editor).toBeVisible();

  const probe = `persistence-probe-${Date.now()}`;
  await editor.click();
  await page.keyboard.type(probe);
  await expect(editor).toContainText(probe);

  await page.waitForTimeout(1000);

  await page.goto(docUrl);

  await expect(page.locator('[aria-label="Document body"]')).toContainText(probe);

  await page.goto('/#/');
  await expect(page.getByRole('link', { name: /Continue writing/i })).toBeVisible();
});
