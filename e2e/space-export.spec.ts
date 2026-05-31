import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('space menu exports the space as a timestamped markdown zip', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);

  const sidebar = page.locator('aside').last();
  await sidebar.getByTestId('sidebar-space-menu-trigger').click();
  await expect(page.getByTestId('space-menu-popover')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('space-menu-popover-export').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/,
  );
});
