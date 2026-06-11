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

  const snapDownload = page.waitForEvent('download');
  await page.getByTestId('space-settings-backups-snapshot').click();
  await snapDownload;

  const history = page.getByTestId('backups-history');
  await expect(history).toBeVisible();

  const rowDownload = page.waitForEvent('download');
  await history.locator('[data-testid$="-download"]').first().click();
  await rowDownload;

  page.once('dialog', (d) => void d.accept());
  await history.locator('[data-testid$="-delete"]').first().click();
  await expect(page.getByTestId('backups-history')).toHaveCount(0);
});

test('backups tab: restoring a snapshot rolls the space back and keeps a pre-restore snapshot', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await page.goto(`/#/s/${spaceId}/settings?tab=backups`);
  const snapDownload = page.waitForEvent('download');
  await page.getByTestId('space-settings-backups-snapshot').click();
  await snapDownload;
  await expect(page.getByTestId('backups-history')).toBeVisible();

  await page.goto(`/#/s/${spaceId}/settings?tab=general`);
  const nameInput = page.getByTestId('space-settings-name-input');
  const originalName = await nameInput.inputValue();
  await nameInput.fill('Renamed After Snapshot');
  await nameInput.press('Enter');

  await page.goto(`/#/s/${spaceId}/settings?tab=backups`);
  const history = page.getByTestId('backups-history');
  await history.locator('[data-testid$="-restore"]').first().click();
  await page.getByTestId('restore-backup-dialog-confirm').click();
  await expect(page.getByText(/snapshot restored/i)).toBeVisible();

  await expect(
    history.locator('tbody tr').filter({ hasText: 'snapshot' }),
  ).toHaveCount(1);

  await page.goto(`/#/s/${spaceId}/settings?tab=general`);
  await expect(page.getByTestId('space-settings-name-input')).toHaveValue(
    originalName,
  );
});
