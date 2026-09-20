import { test, expect } from './_helpers';
import { openCoveredContext, reseedAndGoHome } from './_helpers';
import { pair } from './_pairing';

/**
 * What a pairing is *for*: writing that exists on one device turning up on the
 * other.
 *
 * Everything up to the six digits can pass while nothing syncs at all — the two
 * devices trust each other and exchange an empty manifest — so this is the only
 * spec that proves the point of the feature. It drives two browser contexts over
 * real WebRTC and the camera-free paste path; two devices on a bench are slice
 * 2A.9, not this.
 */

/** Key transfer, then catch-up, then materialisation — all across a connection. */
const SYNC_TIMEOUT = 30_000;

test('a paired device receives writing the other one already had', async ({
  page,
  browser,
  browserName,
}) => {
  const second = await openCoveredContext(browser, browserName);

  // One device has been written on; the other is new. Seeding both would prove
  // nothing — identical content on two devices is indistinguishable from a
  // transfer that never happened.
  await reseedAndGoHome(page);
  await second.goto('/#/');
  await expect(second.getByRole('link', { name: /Continue writing/i })).toHaveCount(0);

  await pair(page, second);

  // Neither device held a key, so the pairing created the account, sealed what
  // was already written, and catch-up carried it across. Watched live rather
  // than after a reload: navigating tears the connection down, and a device
  // reloaded mid-transfer would be asked about writing still in flight.
  await expect(second.locator('[data-testid^="space-rail-space-"]').first()).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });

  // And it survives the reload, because it was materialised rather than merely
  // received.
  await second.goto('/#/');
  await expect(second.getByRole('link', { name: /Continue writing/i })).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });
});

test('writing done after pairing reaches the other device too', async ({
  page,
  browser,
  browserName,
}) => {
  const second = await openCoveredContext(browser, browserName);
  await reseedAndGoHome(page);
  await second.goto('/#/');

  await pair(page, second);
  await expect(second.locator('[data-testid^="space-rail-space-"]').first()).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });

  // Catch-up answered what the second device had missed. This is the other
  // half: a document created while the two are connected, which no exchange
  // was opened for.
  await page.goto('/#/new');
  await expect(page.locator('[data-testid^="templates-card-"]').first()).toBeVisible();
  await page.getByTestId('templates-name-input').fill('Written after pairing');
  await page.getByTestId('templates-submit').click();
  await page.waitForURL(/#\/s\//);

  await expect(
    second.locator('[data-testid^="space-rail-space-"]'),
  ).toHaveCount(2, { timeout: SYNC_TIMEOUT });
});
