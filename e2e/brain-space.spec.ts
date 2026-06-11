import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('brain space screen mounts with topbar showing the unsorted-notes count', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/dump`);

  await expect(page.getByText(/Brain space · \d+ unsorted/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create new space' })).toBeVisible();
});
