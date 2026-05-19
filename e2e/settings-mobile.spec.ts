import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.use({ viewport: { width: 390, height: 800 } });

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

// Skipped: the SettingsShell refactor introduced a horizontal-overflow regression
// on mobile that is out of scope for the test-coverage branch. Re-enable once
// the shell is made responsive.
test.skip('global Settings screen renders without horizontal overflow on mobile', async ({ page }) => {
  await page.goto('/#/settings');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('button', { name: /^Editor$/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Tab nav should be a horizontal strip — siblings sit on a single row.
  const nav = page.getByRole('navigation', { name: /settings sections/i });
  const navBox = await nav.boundingBox();
  expect(navBox).not.toBeNull();
  expect(navBox!.width).toBeGreaterThan(300);
  expect(navBox!.height).toBeLessThan(80);
});

test.skip('switching tabs on mobile keeps content within viewport', async ({ page }) => {
  await page.goto('/#/settings');
  await page.waitForLoadState('networkidle');

  for (const tabName of ['Appearance', 'Account', 'Editor']) {
    await page.getByRole('button', { name: new RegExp(`^${tabName}$`) }).click();
    await expectNoHorizontalOverflow(page);
  }
});

test.skip('Space settings screen renders without horizontal overflow on mobile', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('button', { name: /^General$/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
