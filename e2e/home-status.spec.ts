import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

test('home shows the version chip and the sync warning chip separately', async ({
  page,
}) => {
  await reseedAndGoHome(page);

  await expect(page.getByTestId('home-version-chip')).toHaveText(
    /^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/,
  );

  const syncChip = page.getByTestId('home-sync-chip');
  await expect(syncChip).toBeVisible();
  await expect(syncChip).toHaveText(/sync\/backups not enabled/i);

  // The warning explains itself on focus.
  await syncChip.focus();
  await expect(page.getByRole('tooltip')).toHaveText(/no data sync/i);
});

test('the home header offers sign-in (flag-gated) and leads to the account tab', async ({
  page,
}) => {
  await reseedAndGoHome(page);
  // Without the flag the header carries no sign-in action.
  await expect(page.getByTestId('home-cloud-sign-in')).toHaveCount(0);
  await page.goto('/?cloud-sync=on#/');
  const signIn = page.getByTestId('home-cloud-sign-in');
  await expect(signIn).toBeVisible();
  await signIn.click();
  await expect(page.getByTestId('cloud-section')).toBeVisible();
});

test('the header sign-in action stays within a narrow mobile viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await reseedAndGoHome(page);
  await page.goto('/?cloud-sync=on#/');
  await expect(page.getByTestId('home-cloud-sign-in')).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test.describe('release notice banner', () => {
  // 23 August 2026, 22:00 CEST — mirrored from src/lib/releaseSchedule.ts.
  const RELEASE_AT = Date.UTC(2026, 7, 23, 20, 0, 0);
  const DAY_MS = 24 * 60 * 60 * 1000;

  test('counts down the days to the release and urges a local sync or backup', async ({
    page,
  }) => {
    await page.clock.setFixedTime(RELEASE_AT - 16 * DAY_MS);
    await reseedAndGoHome(page);
    const banner = page.getByTestId('release-notice-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/23 August, 22:00 CEST/);
    await expect(banner).toContainText(/local sync folder or backup/i);
    await expect(page.getByTestId('release-notice-countdown')).toHaveText(
      /16 days remaining/i,
    );
  });

  test('reads one day remaining on the eve of the release', async ({ page }) => {
    await page.clock.setFixedTime(RELEASE_AT - 2 * 60 * 60 * 1000);
    await reseedAndGoHome(page);
    await expect(page.getByTestId('release-notice-countdown')).toHaveText(
      /1 day remaining/i,
    );
  });

  test('disappears once the release moment has passed', async ({ page }) => {
    await page.clock.setFixedTime(RELEASE_AT + DAY_MS);
    await reseedAndGoHome(page);
    await expect(page.getByTestId('home-version-chip')).toBeVisible();
    await expect(page.getByTestId('release-notice-banner')).toHaveCount(0);
  });
});
