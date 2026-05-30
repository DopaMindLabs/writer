/**
 * TEMPORARY — coverage for the "Coming soon" placeholder UI only.
 *
 * These specs exist solely to exercise the ComingSoon placeholder code paths
 * (the `overlay` variant in settings tabs and the tooltip variant in menus)
 * while those features are still stubs. They are NOT real-feature tests.
 *
 * FOR FUTURE AGENTS: when a placeholder is replaced by a real feature, DELETE
 * the corresponding assertion here and cover the shipped feature in its own
 * spec instead. Do not grow this file with real-feature behaviour. The whole
 * file should disappear once the placeholders are gone.
 */
import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('global settings placeholder tabs render the coming-soon overlay', async ({
  page,
}) => {
  await page.goto('/#/settings?tab=general');
  await expect(
    page.locator('[data-coming-soon-overlay="true"]').first(),
  ).toBeVisible();
});

test('space menu surfaces coming-soon items for unbuilt actions', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\//);

  await page
    .locator('aside')
    .last()
    .getByTestId('sidebar-space-menu-trigger')
    .click();
  await expect(page.getByTestId('space-menu-popover')).toBeVisible();
  await expect(page.getByTestId('space-menu-popover-members')).toBeVisible();
  // Members / Duplicate are wrapped in the (non-overlay) ComingSoon tooltip variant.
  await expect(page.locator('[data-coming-soon="true"]').first()).toBeVisible();
});
