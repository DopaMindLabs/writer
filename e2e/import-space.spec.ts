import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('a downloaded space archive can be imported as a new space', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await page.goto(`/#/s/${spaceId}/settings?tab=backups`);
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('space-settings-backups-snapshot').click();
  const download = await downloadPromise;
  const archivePath = await download.path();

  await page.goto('/#/settings?tab=export');
  await expect(page.getByTestId('settings-import-button')).toBeVisible();
  await page.getByTestId('settings-import-file-input').setInputFiles(archivePath);

  await page.waitForURL(
    (url) => url.hash.startsWith('#/s/') && !url.hash.includes(spaceId),
  );
  await expect(page.locator('[aria-label="Document body"]')).toBeVisible();
});

test('importing a file that is not a space archive shows a clear error', async ({
  page,
}) => {
  await page.goto('/#/settings?tab=export');
  await expect(page.getByTestId('settings-import-button')).toBeVisible();
  await page.getByTestId('settings-import-file-input').setInputFiles({
    name: 'junk.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from('not a zip at all'),
  });

  await expect(page.getByText(/import failed/i)).toBeVisible();
});