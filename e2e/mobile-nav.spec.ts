import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.use({ viewport: { width: 390, height: 800 } });

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('mobile nav drawer opens from the topbar and navigates to a doc', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);

  // The hamburger button is only rendered on mobile viewports.
  await page.getByRole('button', { name: /open nav/i }).click();

  // The drawer renders the sidebar; pick the first doc link inside it.
  const drawer = page.locator('[role="dialog"]');
  await expect(drawer).toBeVisible();
  const firstDoc = drawer.getByRole('link').filter({ hasNotText: /github|home|about|settings/i }).first();
  await firstDoc.click();

  // Drawer auto-closes on route change.
  await expect(drawer).toBeHidden();
});
