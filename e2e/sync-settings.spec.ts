import { test, expect } from './_helpers';
import { getFirstSpaceIdFromHome, reseedAndGoHome } from './_helpers';

// Headless Chromium has the File System Access API surface but no real
// directory picker, so the connected folder-sync UI is otherwise unreachable in
// e2e. We stub `showDirectoryPicker` to return a *method-free* handle: it is
// structured-cloneable into IndexedDB (db.meta) so `folderName` populates and
// the connected UI renders, while the missing `getDirectoryHandle`/permission
// methods make writes fail — which is exactly what exercises the error
// StatusGlyph, the failed StatusBadge rows, and the results table.
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

    // Connect the mocked folder; the connected UI (interval chips, sync button)
    // appears once folderName is set.
    await page.getByRole('button', { name: /choose folder/i }).click();
    await expect(page.getByText('Sync Folder')).toBeVisible();

    // ChipGroup value-mode: pick a non-default interval.
    await page.getByRole('button', { name: /^30 min$/ }).click();

    // The method-free handle makes every per-space write fail, so the run
    // produces a results table and error history rows (failed StatusBadge).
    await page.getByRole('button', { name: /sync all spaces/i }).click();
    await expect(page.getByTestId('sync-results')).toBeVisible();
    await expect(page.getByTestId('sync-history')).toBeVisible();

    // Disconnect returns the row to its "choose folder" state.
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
    // syncOneSpace fails on the method-free handle -> StatusGlyph alert line.
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
