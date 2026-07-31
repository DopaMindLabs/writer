import { test, expect } from './_helpers';
import { openCoveredContext, reseedAndGoHome } from './_helpers';
import { pair } from './_pairing';

/**
 * Removal is not the end of a device. The user's own path — pair, work, remove
 * the device, think better of it, pair again — must come back to a working
 * sync, because the re-pairing is confirmed by a human on both screens and the
 * device proves the same identity it always had.
 *
 * This is the regression spec for the trap where a revoked trust record
 * survived re-pairing untouched: the dialog said "Devices paired" while every
 * frame the device sent was refused against its revoked record.
 */

/** Key transfer, then catch-up, then materialisation — all across a connection. */
const SYNC_TIMEOUT = 30_000;

test('sync survives removing a device and pairing it again', async ({
  page,
  browser,
  browserName,
}) => {
  // Two complete pairing exchanges and two sync rounds in one test: the
  // default per-test budget fits one.
  test.setTimeout(120_000);
  const second = await openCoveredContext(browser, browserName);
  await reseedAndGoHome(page);
  await second.goto('/#/');

  await pair(page, second);
  await expect(second.locator('[data-testid^="space-rail-space-"]').first()).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });

  // The completed pairing leaves its dialog up on both devices; the device
  // list sits behind it. A handed-over session survives the dialog closing.
  await page.keyboard.press('Escape');
  await second.keyboard.press('Escape');

  // Remove the other device on the first one. The list keeps it, badged as
  // removed — "never paired" and "paired and removed" must stay tellable apart.
  await page.locator('[data-testid^="trusted-device-remove-"]').first().click();
  await expect(page.getByText('Removed', { exact: true })).toBeVisible();

  // Pair the same two devices again — the ordinary walk, digits confirmed on
  // both screens. That confirmation is what restores trust.
  await pair(page, second);
  await page.keyboard.press('Escape');
  await second.keyboard.press('Escape');

  // The badge is gone: the record was reactivated, not duplicated.
  await expect(page.getByText('Removed', { exact: true })).toHaveCount(0);

  // Writing done on the once-removed device reaches this one — the direction
  // the revoked record used to silence.
  await second.goto('/#/new');
  await expect(second.locator('[data-testid^="templates-card-"]').first()).toBeVisible();
  await second.getByTestId('templates-name-input').fill('Written after re-pairing');
  await second.getByTestId('templates-submit').click();
  await second.waitForURL(/#\/s\//);

  await expect(page.locator('[data-testid^="space-rail-space-"]')).toHaveCount(2, {
    timeout: SYNC_TIMEOUT,
  });
});
