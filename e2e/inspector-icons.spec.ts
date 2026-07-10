import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

async function gotoFirstDoc(page: import('@playwright/test').Page): Promise<{
  spaceId: string;
  docId: string;
}> {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const docId = new URL(page.url()).hash.match(/\/d\/([^/?]+)/)?.[1];
  if (!docId) throw new Error(`Could not extract docId from ${page.url()}`);
  return { spaceId, docId };
}

test('shows the inspector icons rail after toggling from the topbar', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await page.getByRole('button', { name: /doc inspector/i }).click();
  await expect(page.getByTestId('doc-inspector-icons')).toBeVisible();
});

test('clicking a section icon expands the inspector to full width', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await page.getByRole('button', { name: /doc inspector/i }).click();
  const rail = page.getByTestId('doc-inspector-icons');
  await expect(rail).toBeVisible();
  await rail.getByRole('button', { name: /outline/i }).click();
  await expect(rail).toBeHidden();
});

test('collapse button hides the rail', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await page.getByRole('button', { name: /doc inspector/i }).click();
  const rail = page.getByTestId('doc-inspector-icons');
  await expect(rail).toBeVisible();
  await rail.getByRole('button', { name: /collapse/i }).click();
  await expect(rail).toBeHidden();
});
