import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.use({ viewport: { width: 390, height: 800 } });

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('mobile nav drawer opens from the topbar and navigates to a doc', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  // WriteScreen redirects /s/:id → /s/:id/d/:firstDocId once Dexie loads. Let
  // that settle first, otherwise the late route change auto-closes the drawer
  // mid-test.
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/?]+/);
  const currentDocId = new URL(page.url()).hash.match(/\/d\/([^/?]+)/)?.[1];

  await page.getByRole('button', { name: /open nav/i }).click();

  // The drawer renders the sidebar; navigate to a doc other than the current
  // one so the route actually changes.
  const drawer = page.locator('[role="dialog"]');
  await expect(drawer).toBeVisible();
  const otherDoc = drawer
    .locator(`a[data-testid^="sidebar-doc-"]:not([href*="/d/${currentDocId}"])`)
    .first();
  await otherDoc.click();

  await expect(drawer).toBeHidden();
  expect(page.url()).not.toContain(`/d/${currentDocId}`);
});
