import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { openCoveredPage } from './_helpers';

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

/** A second device: its own context, instrumented so its lines reach coverage. */
const openSecondDevice = async (
  context: BrowserContext,
  browserName: string,
): Promise<Page> => openCoveredPage(context, browserName);

test('two devices pair over QR symbols and agree on one verification code', async ({
  page,
  browser,
  browserName,
}) => {
  const joinerContext = await browser.newContext();
  const joiner = await openSecondDevice(joinerContext, browserName);

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

  await joinerContext.close();
});

test('a symbol from an unrelated session is refused mid-scan', async ({
  page,
  browser,
  browserName,
}) => {
  // Two devices showing codes, so there are two distinct sessions to confuse.
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const first = await openSecondDevice(firstContext, browserName);
  const second = await openSecondDevice(secondContext, browserName);

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

  await firstContext.close();
  await secondContext.close();
});

test('the pairing dialog is reachable and named from Account settings', async ({ page }) => {
  await openPairing(page);

  await expect(page.getByRole('dialog', { name: 'Pair another device' })).toBeVisible();
  await expect(page.getByTestId('pairing-role-show')).toBeEnabled();
  await expect(page.getByTestId('pairing-role-read')).toBeEnabled();
});
