import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('mode tabs and focus toggle move between doc views', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  await page.getByRole('link', { name: 'read', exact: true }).click();
  await page.waitForURL(/\/read/);

  await page.getByRole('link', { name: 'split', exact: true }).click();
  await page.waitForURL(/\/split/);

  await page.getByRole('link', { name: 'write', exact: true }).click();
  await page.waitForURL(/\/d\/[^/?#]+$/);

  await page.getByTestId('focus-toggle').click();
  await expect(page).toHaveURL(/focus=1/);
  await page.getByTestId('focus-toggle').click();
  await expect(page).not.toHaveURL(/focus=1/);
});
