import { test, expect } from './_helpers';
import { reseedAndGoHome, stubDirectoryPicker } from './_helpers';

test.beforeEach(async ({ page }) => {
  await stubDirectoryPicker(page);
  await reseedAndGoHome(page);
});

test.describe('Workflow: space setup, backup, and sync', () => {
  test('create, rename, configure, back up, sync to a folder, and export', async ({
    page,
  }) => {
    let spaceId = '';

    await test.step('Given they create a space from a template (cloud sync is an off/local placeholder)', async () => {
      await page.getByRole('link', { name: /Start a new space/i }).first().click();
      await expect(page.getByTestId('templates-screen')).toBeVisible();
      await expect(page.getByText(/cloud sync/i)).toBeVisible();
      const cloudSyncSwitch = page.getByRole('switch');
      await expect(cloudSyncSwitch).toHaveAttribute('aria-disabled', 'true');

      await page.getByTestId('templates-card-humanities').click();
      await page.locator('#space-name').fill('Doctoral Thesis');
      await page.locator('#space-tag').fill('THS');
      await page.getByTestId('templates-submit').click();
      await page.waitForURL(/#\/s\/[^/]+/);
      spaceId = new URL(page.url()).hash.match(/\/s\/([^/?#]+)/)?.[1] ?? '';
      expect(spaceId).not.toBe('');
    });

    await test.step('When they inline-rename the space via the sidebar', async () => {
      const sidebar = page.locator('aside').last();
      await sidebar.getByRole('button', { name: 'Doctoral Thesis' }).click();
      const renameInput = sidebar.getByRole('textbox', { name: 'Rename space' });
      await renameInput.fill('Doctoral Thesis (v2)');
      await renameInput.press('Enter');
      await expect(
        sidebar.getByRole('button', { name: 'Doctoral Thesis (v2)' }),
      ).toBeVisible();
    });

    await test.step('And they change the name on the General settings tab', async () => {
      await page.goto(`/#/s/${spaceId}/settings`);
      const nameInput = page.getByTestId('space-settings-name-input');
      await nameInput.fill('Doctoral Thesis (final)');
      await nameInput.press('Enter');
      await expect(nameInput).toHaveValue('Doctoral Thesis (final)');
    });

    await test.step('And they run the full backup lifecycle on the Backups tab', async () => {
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

    await test.step('And they connect a folder, pick an interval, sync, and disconnect', async () => {
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

    await test.step('And they switch the theme to dark via quick settings', async () => {
      await page.goto(`/#/s/${spaceId}`);
      await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
      await page.getByRole('button', { name: /LIpsum Writer/i }).first().click();
      const popover = page.getByTestId('quick-settings-popover');
      await expect(popover).toBeVisible();
      await popover.getByRole('button', { name: /^dark$/i }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });

    await test.step('Then they export the whole space as a timestamped markdown zip', async () => {
      const sidebar = page.locator('aside').last();
      await sidebar.getByTestId('sidebar-space-menu-trigger').click();
      await expect(page.getByTestId('space-menu-popover')).toBeVisible();
      const downloadPromise = page.waitForEvent('download');
      await page.getByTestId('space-menu-popover-export').click();
      expect((await downloadPromise).suggestedFilename()).toMatch(
        /-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/,
      );
    });
  });
});
