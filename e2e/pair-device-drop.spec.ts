import { test, expect } from './_helpers';
import { openCoveredContext, reseedAndGoHome } from './_helpers';
import { pair } from './_pairing';

/**
 * A real connection dying, noticed.
 *
 * `peer-link-state.spec.ts` drives the same surfaces through the build's test
 * seam, which is what makes the states around a drop testable at all. This one
 * pays for the thing that seam cannot prove: that a genuine `RTCPeerConnection`
 * losing its peer reaches the same place. Nothing here is faked — two browser
 * contexts pair for real, and one of them goes away.
 *
 * Slow on purpose. ICE re-checks take their time to give up, and how long is the
 * browser's business rather than ours, so the wait is generous and on the
 * condition rather than the clock.
 */

/** How long Chromium may take to admit a peer that has gone is not coming back. */
const DROP_TIMEOUT = 150_000;

test('a device that goes away is reported as no longer connected', async ({
  page,
  browser,
  browserName,
}) => {
  // A full pairing exchange plus the browser's own patience with a dead peer.
  test.setTimeout(240_000);

  const other = await openCoveredContext(browser, browserName);
  await reseedAndGoHome(page);
  await other.goto('/#/');

  await pair(page, other);
  // The completed pairing leaves its dialog up; the device list is behind it,
  // and the session survives the dialog closing.
  await page.keyboard.press('Escape');

  const row = page.locator('[data-testid^="trusted-device-"]').first();
  await expect(row).toBeVisible();
  await expect(page.getByTestId('device-link-connected')).toBeVisible({
    timeout: DROP_TIMEOUT,
  });

  // The other device goes: a closed lid, a closed tab, a walk out of range.
  await other.context().close();

  await expect(page.getByTestId('device-link-dropped')).toBeVisible({
    timeout: DROP_TIMEOUT,
  });
  // And the same loss, said once, wherever the user happens to be.
  await expect(page.getByTestId('peer-link-notice')).toBeVisible();
  // A device that has sent no name yet still says what the action is for; the
  // named form is exercised in `peer-link-state.spec.ts`.
  await expect(
    page.getByRole('button', { name: 'Reconnect this paired device' }),
  ).toBeVisible();
});

test('the reading device notices too when the showing device goes away', async ({
  browser,
  browserName,
}) => {
  // The mirrored direction. The two ends take different ICE roles, so "a drop is
  // noticed" proved on one of them is not proved on the other.
  //
  // Both devices are auxiliary contexts because the one that leaves must not be
  // the fixture page, whose coverage teardown a closed context breaks.
  test.setTimeout(240_000);

  const showingDevice = await openCoveredContext(browser, browserName);
  const readingDevice = await openCoveredContext(browser, browserName);
  await showingDevice.goto('/#/');
  await readingDevice.goto('/#/');

  await pair(showingDevice, readingDevice);
  await readingDevice.keyboard.press('Escape');
  await expect(readingDevice.getByTestId('device-link-connected')).toBeVisible({
    timeout: DROP_TIMEOUT,
  });

  await showingDevice.context().close();

  await expect(readingDevice.getByTestId('device-link-dropped')).toBeVisible({
    timeout: DROP_TIMEOUT,
  });
  await expect(readingDevice.getByTestId('peer-link-notice')).toBeVisible();
});
