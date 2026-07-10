import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('universal settings placeholder tabs render the coming-soon overlay', async ({
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
  await expect(page.locator('[data-coming-soon="true"]').first()).toBeVisible();
});
