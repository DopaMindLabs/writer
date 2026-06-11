import { test, expect } from './_helpers';
import { getFirstSpaceIdFromHome, reseedAndGoHome } from './_helpers';

const stubDirectoryPicker = async (page: Parameters<typeof reseedAndGoHome>[0]) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      writable: true,
      value: () => Promise.resolve({ name: 'Sync Folder', kind: 'directory' }),
    });
  });
};

test.describe('Folder sync settings', () => {
  test.beforeEach(async ({ page }) => {
    await stubDirectoryPicker(page);
    await reseedAndGoHome(page);
  });

  test('global Sync tab: connect, change interval, run sync, disconnect', async ({
    page,
  }) => {
    await page.goto('/#/settings?tab=sync');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /choose folder/i }).click();
    await expect(page.getByText('Sync Folder')).toBeVisible();

    await page.getByRole('button', { name: /^30 min$/ }).click();

    await page.getByRole('button', { name: /sync all spaces/i }).click();
    await expect(page.getByTestId('sync-results')).toBeVisible();
    await expect(page.getByTestId('sync-history')).toBeVisible();

    await page.getByRole('button', { name: /^disconnect$/i }).click();
    await expect(
      page.getByRole('button', { name: /choose folder/i }),
    ).toBeVisible();
  });

  test('space Sync tab: a failed manual sync surfaces an error', async ({
    page,
  }) => {
    const spaceId = await getFirstSpaceIdFromHome(page);
    await page.goto(`/#/s/${spaceId}/settings?tab=sync`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /choose folder/i }).click();
    await expect(page.getByText('Sync Folder')).toBeVisible();

    await page.getByRole('button', { name: /sync this space/i }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
