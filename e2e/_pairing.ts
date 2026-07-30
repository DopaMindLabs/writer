import type { Page } from '@playwright/test';
import { expect } from './_helpers';

/**
 * The camera-free pairing walk two specs (and any future one) drive: show a
 * code on one device, paste it on the other, read the reply back, confirm the
 * digits on both. Lifted verbatim from `pair-sync.spec.ts` so a spec about what
 * happens *after* a pairing does not restate how one is made.
 */

/** The device may still be gathering candidates when a step is reached. */
export const GATHERING_TIMEOUT = 30_000;

export const openPairing = async (page: Page): Promise<void> => {
  await page.goto('/#/settings?tab=deviceSync');
  await expect(page.getByTestId('pair-device-open')).toBeVisible();
  await page.getByTestId('pair-device-open').click();
  // The dialog opens on the choice, not on a code: one device shows, the other
  // scans, and neither surface appears before someone has picked.
  await expect(page.getByTestId('pairing-start-step')).toBeVisible();
};

/**
 * Take the showing half, and wait for the code itself: the step appears at once
 * and names the wait while the device is still gathering.
 */
export const showCode = async (page: Page): Promise<void> => {
  await page.getByTestId('pairing-start-show').click();
  await expect(page.getByRole('img', { name: 'Pairing code from this device' })).toBeVisible({
    timeout: GATHERING_TIMEOUT,
  });
};

/**
 * Ask the reading device for its reply. The step lands under the press that
 * finished the scan, so the code stays behind a reveal — nothing is on screen
 * for that press to dismiss.
 */
export const revealReply = async (page: Page): Promise<void> => {
  await page.getByTestId('pairing-reply-reveal').click();
  await expect(page.getByRole('img', { name: 'Reply code from this device' })).toBeVisible({
    timeout: GATHERING_TIMEOUT,
  });
};

export const readSymbols = async (page: Page): Promise<string[]> => {
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

/**
 * Hand symbols over the camera-free path. The scanner is reached from the start
 * choice, or — on a device already showing its code — from the action that says
 * the code has been read.
 */
export const pasteSymbols = async (
  page: Page,
  symbols: readonly string[],
  from: 'start' | 'showing' = 'start',
): Promise<void> => {
  await page.getByTestId(from === 'start' ? 'pairing-start-scan' : 'pairing-scan-start').click();
  for (const symbol of symbols) {
    await page.getByLabel('Or paste the code text').fill(symbol);
    await page.getByRole('button', { name: 'Use this code' }).click();
  }
};

/** Take two devices all the way through to "Devices paired" on both. */
export const pair = async (showingDevice: Page, readingDevice: Page): Promise<void> => {
  await openPairing(showingDevice);
  await openPairing(readingDevice);

  // Sequenced rather than simultaneous: one device shows, the other scans.
  await showCode(showingDevice);
  await pasteSymbols(readingDevice, await readSymbols(showingDevice));
  await expect(readingDevice.getByTestId('pairing-reply-step')).toBeVisible({
    timeout: GATHERING_TIMEOUT,
  });
  await revealReply(readingDevice);

  await pasteSymbols(showingDevice, await readSymbols(readingDevice), 'showing');
  await readingDevice.getByTestId('pairing-reply-shown').click();

  await expect(showingDevice.getByTestId('pairing-verification-code')).toBeVisible({
    timeout: GATHERING_TIMEOUT,
  });
  await showingDevice.getByTestId('pairing-verification-confirm').click();
  await readingDevice.getByTestId('pairing-verification-confirm').click();

  await expect(showingDevice.getByTestId('pair-device-complete')).toBeVisible();
  await expect(readingDevice.getByTestId('pair-device-complete')).toBeVisible();
};
