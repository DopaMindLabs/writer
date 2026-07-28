import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { openCoveredContext } from './_helpers';

/**
 * Pairing two devices, end to end.
 *
 * Each side runs in its own browser context so the two hold separate device
 * identities and separate storage — the same context would pair a device with
 * itself and prove nothing. The camera-free paste path carries the symbols,
 * because a headless run has no camera to point at a screen.
 */

/**
 * Long enough to cover the engine's candidate-gathering deadline. Gathering
 * routinely stalls short of `complete` on a host whose mDNS responder cannot
 * bind — a CI runner among them — so a code can legitimately take the full
 * deadline to appear. This waits on the code, never on the clock.
 */
const GATHERING_TIMEOUT = 30_000;

const openPairing = async (page: Page): Promise<void> => {
  await page.goto('/#/settings?tab=account');
  await expect(page.getByTestId('pair-device-open')).toBeVisible();
  await page.getByTestId('pair-device-open').click();
  await expect(page.getByTestId('pairing-role-choice')).toBeVisible();
};

/** Read every symbol of the code currently on screen, stepping the pager. */
const readSymbols = async (page: Page): Promise<string[]> => {
  const field = page.getByTestId('pairing-code-payload');
  await expect(field).toBeVisible({ timeout: GATHERING_TIMEOUT });
  const next = page.getByRole('button', { name: 'Next' });
  const symbols: string[] = [];
  for (;;) {
    symbols.push(await field.inputValue());
    if (!(await next.isVisible()) || (await next.isDisabled())) return symbols;
    await next.click();
  }
};

/** Hand symbols to the other device the way a user without a camera would. */
const pasteSymbols = async (page: Page, symbols: readonly string[]): Promise<void> => {
  for (const symbol of symbols) {
    await page.getByLabel('Or paste the code text').fill(symbol);
    await page.getByRole('button', { name: 'Use this code' }).click();
  }
};

const verificationCode = (page: Page) => page.getByTestId('pairing-verification-code');

test('two devices pair over QR symbols and agree on one verification code', async ({
  page,
  browser,
  browserName,
}) => {
  const joiner = await openCoveredContext(browser, browserName);

  await openPairing(page);
  await openPairing(joiner);

  await page.getByTestId('pairing-role-show').click();
  await joiner.getByTestId('pairing-role-read').click();

  // The showing device gathers, then its code goes to the reading device.
  await pasteSymbols(joiner, await readSymbols(page));

  // Answering is what binds the transcript, so the reply device knows the
  // digits first — its peer learns them only once it has read the reply.
  await expect(verificationCode(joiner)).toBeVisible({ timeout: GATHERING_TIMEOUT });
  await pasteSymbols(page, await readSymbols(joiner));

  await expect(verificationCode(page)).toBeVisible({ timeout: GATHERING_TIMEOUT });
  const shown = await verificationCode(page).innerText();
  expect(shown).toMatch(/^\d{6}$/);
  await expect(verificationCode(joiner)).toHaveText(shown);

  // Neither side completes on authentication alone.
  await expect(page.getByTestId('pair-device-complete')).toHaveCount(0);

  await page.getByTestId('pairing-verification-confirm').click();
  await joiner.getByTestId('pairing-verification-confirm').click();

  await expect(page.getByTestId('pair-device-complete')).toBeVisible();
  await expect(joiner.getByTestId('pair-device-complete')).toBeVisible();
});

test('a symbol from an unrelated session is refused mid-scan', async ({
  page,
  browser,
  browserName,
}) => {
  // Two devices showing codes, so there are two distinct sessions to confuse.
  const first = await openCoveredContext(browser, browserName);
  const second = await openCoveredContext(browser, browserName);

  await openPairing(first);
  await openPairing(second);
  await first.getByTestId('pairing-role-show').click();
  await second.getByTestId('pairing-role-show').click();

  const [fromFirst] = await readSymbols(first);
  const [fromSecond] = await readSymbols(second);

  await openPairing(page);
  await page.getByTestId('pairing-role-read').click();
  await pasteSymbols(page, [fromFirst, fromSecond]);

  // Adopting the stray would let a substituted code take over a scan the user
  // believes is still collecting their own device's answer.
  await expect(page.getByTestId('pairing-scan-problem')).toBeVisible();
});

test('a photographed code is read from an uploaded image', async ({
  page,
  browser,
  browserName,
}) => {
  // The path a user without a paired camera takes: point a phone at the screen,
  // then upload the picture. Rendering the symbol and reading it back proves
  // the encoder and the detector agree on a real image, not on a fixture.
  const shower = await openCoveredContext(browser, browserName);
  await openPairing(shower);
  await shower.getByTestId('pairing-role-show').click();

  const symbol = shower.getByRole('img', { name: 'Pairing code from this device' });
  await expect(symbol).toBeVisible({ timeout: GATHERING_TIMEOUT });
  const photograph = await symbol.screenshot();

  await openPairing(page);
  await page.getByTestId('pairing-role-read').click();
  await page
    .getByLabel('Upload a photo of the code')
    .setInputFiles({ name: 'code.png', mimeType: 'image/png', buffer: photograph });

  // Either the payload was complete and this device answered, or it was one of
  // several symbols and the scanner says which are outstanding. Both mean the
  // image was decoded; neither is the unreadable-image message.
  await expect(
    page
      .getByTestId('pairing-scan-progress')
      .or(page.getByRole('img', { name: 'Reply code from this device' }))
      .or(page.getByTestId('pair-device-authenticating')),
  ).toBeVisible({ timeout: GATHERING_TIMEOUT });
});

test('the pairing dialog is reachable and named from Account settings', async ({ page }) => {
  await openPairing(page);

  await expect(page.getByRole('dialog', { name: 'Pair another device' })).toBeVisible();
  await expect(page.getByTestId('pairing-role-show')).toBeEnabled();
  await expect(page.getByTestId('pairing-role-read')).toBeEnabled();
});

/**
 * The camera path, driven against Chromium's synthetic capture device (see the
 * launch args in `playwright.config.ts`). The fake device emits a rolling
 * pattern rather than a code, so scanning runs and finds nothing — which is
 * exactly the loop worth exercising here. That the reading device *can* start,
 * report, and release a camera is what the unit suite cannot prove.
 */
test('the reading device can start and stop its camera', async ({ page }) => {
  await openPairing(page);
  await page.getByTestId('pairing-role-read').click();

  const start = page.getByRole('button', { name: 'Use the camera' });
  await expect(start).toBeVisible();
  // Nothing is asked for until the user asks: no viewfinder before the press.
  await expect(page.getByTestId('qr-scan-camera')).toBeHidden();

  await start.click();

  await expect(page.getByTestId('qr-scan-camera')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Looking for a code…');

  const stop = page.getByRole('button', { name: 'Stop the camera' });
  await expect(stop).toBeVisible();
  await stop.click();

  // Back to the offer state, viewfinder gone — the camera is not left running.
  await expect(start).toBeVisible();
  await expect(page.getByTestId('qr-scan-camera')).toBeHidden();
});

test('the camera never displaces the ways in that need no permission', async ({
  page,
}) => {
  await openPairing(page);
  await page.getByTestId('pairing-role-read').click();

  await page.getByRole('button', { name: 'Use the camera' }).click();
  await expect(page.getByTestId('qr-scan-camera')).toBeVisible();

  // Both camera-free paths stay put while the camera is live, so a user who
  // gives up on it has somewhere to go without closing the dialog.
  await expect(page.getByLabel('Upload a photo of the code')).toBeVisible();
  await expect(page.getByLabel('Or paste the code text')).toBeVisible();
});
