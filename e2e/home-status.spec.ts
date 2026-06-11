import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

test('home shows the version chip and the sync warning chip separately', async ({
  page,
}) => {
  await reseedAndGoHome(page);

  await expect(page.getByTestId('home-version-chip')).toHaveText(
    /^\d+\.\d+\.\d+-alpha$/,
  );

  const syncChip = page.getByTestId('home-sync-chip');
  await expect(syncChip).toBeVisible();
  await expect(syncChip).toHaveText(/sync\/backups not enabled/i);

  // The warning explains itself on focus.
  await syncChip.focus();
  await expect(page.getByRole('tooltip')).toHaveText(/no data sync/i);
});
