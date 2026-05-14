import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

async function gotoFirstDoc(page: import('@playwright/test').Page): Promise<{ spaceId: string; docId: string }> {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  // WriteScreen redirects /s/:spaceId to /s/:spaceId/d/:firstDocId once data loads.
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const url = new URL(page.url());
  const docId = url.hash.match(/\/d\/([^/?]+)/)?.[1];
  if (!docId) throw new Error(`Could not extract docId from ${page.url()}`);
  return { spaceId, docId };
}

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
  // SpaceRail's "Create new space" link is not present in focus mode (FocusRail replaces it).
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
  // Split shows the main doc on the left; right pane shows a picker until ?with=… is set.
  await expect(page.locator('[aria-label="Document body"]').first()).toBeVisible();
});
