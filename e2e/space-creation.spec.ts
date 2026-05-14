import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('creates a new space from a template and lands on the editor', async ({ page }) => {
  await page.getByRole('link', { name: /Start a new space/i }).click();
  await expect(page.getByRole('heading', { name: /What kind of space/i })).toBeVisible();

  const nameInput = page.locator('#space-name');
  const tagInput = page.locator('#space-tag');
  await nameInput.fill('My Test Space');
  await tagInput.fill('TST');

  await page.getByRole('button', { name: /enter My Test Space/i }).click();

  await page.waitForURL(/#\/s\/[^/]+/);
  await expect(page.locator('[aria-label="Document body"]')).toBeVisible();
});
