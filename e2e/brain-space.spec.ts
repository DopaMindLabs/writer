import { test, expect } from '@playwright/test';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('brain space screen mounts with topbar showing the unsorted-notes count', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/dump`);

  await expect(page.getByText(/Brain space · \d+ unsorted/i)).toBeVisible();
  // SpaceRail is present in non-focus brain space view.
  await expect(page.getByRole('link', { name: 'Create new space' })).toBeVisible();
});
