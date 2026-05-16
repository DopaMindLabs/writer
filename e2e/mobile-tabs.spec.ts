import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.use({ viewport: { width: 390, height: 800 } });

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

test('renders the bottom-tabs nav on small viewports', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await expect(page.getByTestId('mobile-tabs')).toBeVisible();
});

test('brain tab navigates to /dump', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  const tabs = page.getByTestId('mobile-tabs');
  await tabs.getByRole('link', { name: /brain/i }).click();
  await expect(page).toHaveURL(/\/dump(\?|$)/);
});

test('cite tab opens the citations drawer', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  const tabs = page.getByTestId('mobile-tabs');
  await tabs.getByRole('button', { name: /cite/i }).click();
  await expect(page.locator('aside[aria-label="Citations"]')).toBeVisible();
});

test('more tab opens the mobile-more drawer', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  const tabs = page.getByTestId('mobile-tabs');
  await tabs.getByRole('button', { name: /more/i }).click();
  // The MobileMoreSheet renders inside a Radix Dialog portal.
  await expect(page.getByRole('dialog').first()).toBeVisible();
});
