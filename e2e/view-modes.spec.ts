import { test, expect } from './_helpers';
import { reseedAndGoHome, gotoFirstDoc } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('write mode renders SpaceRail and an editable document body', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await expect(page.getByRole('link', { name: 'Create new space' })).toBeVisible();
  await expect(page.locator('[aria-label="Document body"]')).toBeEditable();
});

test('focus mode hides the SpaceRail', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}/focus`);
  await expect(page.locator('[aria-label="Document body"]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create new space' })).toHaveCount(0);
});

test('read mode renders a non-editable document body', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}/read`);
  const editor = page.locator('[aria-label="Document body"]');
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute('contenteditable', 'false');
});

test('split mode renders two document bodies', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}/split`);
  await expect(page.locator('[aria-label="Document body"]').first()).toBeVisible();
});
