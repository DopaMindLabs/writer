import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('backups tab: snapshot adds a row that can be downloaded and deleted', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings?tab=backups`);

  // Snapshot triggers a download and adds a history row.
  const snapDownload = page.waitForEvent('download');
  await page.getByTestId('space-settings-backups-snapshot').click();
  await snapDownload;

  const history = page.getByTestId('backups-history');
  await expect(history).toBeVisible();

  // Download the stored backup row.
  const rowDownload = page.waitForEvent('download');
  await history.locator('[data-testid$="-download"]').first().click();
  await rowDownload;

  // Delete it (confirm dialog) — the table empties out afterward.
  page.once('dialog', (d) => void d.accept());
  await history.locator('[data-testid$="-delete"]').first().click();
  await expect(page.getByTestId('backups-history')).toHaveCount(0);
});
