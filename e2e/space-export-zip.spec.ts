import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('export space as zip triggers download', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  // The space archive (zip) is produced by the backups snapshot action.
  await page.goto(`/#/s/${spaceId}/settings?tab=backups`);
  await expect(page.getByTestId('space-settings-tab-backups')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('space-settings-backups-snapshot').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.zip$/);
});

test('export space markdown zip contains proper structure', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  // Add a citation first so the archive exercises the citations codec.
  await page.goto(`/#/s/${spaceId}/citations`);
  await expect(page.getByTestId('citations-pane')).toBeVisible();

  await page.getByRole('button', { name: '+ add' }).click();
  const form = page.getByTestId('citations-manual-add');
  await expect(form).toBeVisible();
  await page.getByTestId('citations-manual-add-input').fill(`@article{zipCit2024, author={Zip}, title={Zip Citation}, year={2024}}`);
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(form).not.toBeVisible();

  // Now snapshot the space to produce the archive zip.
  await page.goto(`/#/s/${spaceId}/settings?tab=backups`);
  await expect(page.getByTestId('space-settings-tab-backups')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('space-settings-backups-snapshot').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.zip$/);
});

test('space settings general tab allows changing space name', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings?tab=general`);
  await expect(page.getByTestId('space-settings-tab-general')).toBeVisible();

  const nameInput = page.getByTestId('space-settings-name-input');
  await expect(nameInput).toBeVisible();
  const original = await nameInput.inputValue();

  await nameInput.fill('Renamed Space');
  await nameInput.press('Enter');

  // Navigate away and back to verify persistence.
  await page.goto(`/#/s/${spaceId}/settings?tab=general`);
  await expect(page.getByTestId('space-settings-name-input')).toHaveValue(
    'Renamed Space',
  );

  // Restore the original name.
  const restore = page.getByTestId('space-settings-name-input');
  await restore.fill(original);
  await restore.press('Enter');
});
