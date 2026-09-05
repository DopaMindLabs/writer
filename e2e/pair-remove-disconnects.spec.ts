import { test, expect } from './_helpers';
import { openCoveredContext, reseedAndGoHome } from './_helpers';
import { pair } from './_pairing';

/**
 * Removing a device is meant to end the relationship, not schedule its end.
 *
 * This is the regression spec for the trap where revocation only stopped the
 * *next* session: the two devices stayed connected, so the removed one kept
 * receiving frames and kept answering catch-up until one of them reloaded —
 * while the device list, and the help beside it, said removal had taken effect.
 */

/** Key transfer, then catch-up, then materialisation — all across a connection. */
const SYNC_TIMEOUT = 30_000;

test('removing a device disconnects it and stops its writing arriving', async ({
  page,
  browser,
  browserName,
}) => {
  // A full pairing exchange, a sync round and a removal in one test: the
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

  // The control: while the two are connected, each says so of the other.
  await expect(second.getByText('Connected', { exact: true }).first()).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });

  await page.locator('[data-testid^="trusted-device-remove-"]').first().click();
  await expect(page.getByText('Removed', { exact: true })).toBeVisible();

  // The removed device sees the link go, without being asked to reload: the
  // removal closed the session rather than only revoking the record.
  await expect(second.getByText('Connected', { exact: true })).toHaveCount(0, {
    timeout: SYNC_TIMEOUT,
  });

  // Writing done on the removed device stays there. The space it creates is
  // visible on the device that made it, which is what makes the absence on the
  // other device an assertion rather than a race.
  await second.goto('/#/new');
  await expect(second.locator('[data-testid^="templates-card-"]').first()).toBeVisible();
  await second.getByTestId('templates-name-input').fill('Written after removal');
  await second.getByTestId('templates-submit').click();
  await second.waitForURL(/#\/s\//);
  await expect(second.locator('[data-testid^="space-rail-space-"]')).toHaveCount(2, {
    timeout: SYNC_TIMEOUT,
  });

  await expect(page.locator('[data-testid^="space-rail-space-"]')).toHaveCount(1);
});
