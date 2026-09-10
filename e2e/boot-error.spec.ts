import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';

const BOOT_FAILURE_MESSAGE = 'E2E: IndexedDB unavailable';

/** The switch the injected `indexedDB.open` reads, exposed for the spec to flip. */
interface BootFailureWindow {
  __e2eBreakAppDb: boolean;
}

/**
 * Make every open of the app database fail while the switch is on.
 *
 * Boot opens `lipsum-device-vault` before it touches `lipsum` (key hydration
 * runs first), so only the app database is broken; and the failure is switched
 * rather than one-shot, because the number of opens before boot reports the
 * error is an implementation detail — the reset the screen offers reopens the
 * same database, and the spec turns the switch off for that.
 */
const breakAppDbOpen = (page: Page): Promise<void> =>
  page.addInitScript(
    ({ message }) => {
      const original = indexedDB.open.bind(indexedDB);
      (window as unknown as BootFailureWindow).__e2eBreakAppDb = true;
      indexedDB.open = ((name: string, version?: number) => {
        if (
          name === 'lipsum' &&
          (window as unknown as BootFailureWindow).__e2eBreakAppDb
        ) {
          throw new Error(message);
        }
        return version === undefined ? original(name) : original(name, version);
      }) as typeof indexedDB.open;
    },
    { message: BOOT_FAILURE_MESSAGE },
  );

const repairAppDbOpen = (page: Page): Promise<void> =>
  page.evaluate(() => {
    (window as unknown as BootFailureWindow).__e2eBreakAppDb = false;
  });

test('surfaces a boot failure and recovers through the reset confirmation', async ({
  page,
}) => {
  await breakAppDbOpen(page);
  // `?reseed=1` forces the app database open during boot, so the injected
  // failure lands on the boot path rather than on a later lazy read.
  await page.goto('/?reseed=1#/');

  await expect(page.getByText('Boot error')).toBeVisible();
  await expect(page.getByText(BOOT_FAILURE_MESSAGE)).toBeVisible();
  await expect(
    page.getByText(/you can erase the app's local data and start afresh/i),
  ).toBeVisible();

  // Cancelling leaves the failure on screen — nothing is erased.
  await page.getByRole('button', { name: 'Reset local data…' }).click();
  const dialog = page.getByTestId('confirm-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Erase all local data?')).toBeVisible();
  await page.getByTestId('confirm-dialog-cancel').click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Boot error')).toBeVisible();

  // With the database reachable again, confirming reseeds and the app boots.
  await repairAppDbOpen(page);
  await page.getByRole('button', { name: 'Reset local data…' }).click();
  await expect(page.getByTestId('confirm-dialog')).toBeVisible();
  await page.getByTestId('confirm-dialog-confirm').click();

  await expect(page.getByText('Boot error')).toBeHidden();
  await expect(
    page.getByRole('link', { name: /Continue writing|Start a new space/i }).first(),
  ).toBeVisible();
});
