import { test, expect } from './_helpers';
import { gotoFirstDoc } from './_helpers';

/**
 * Recovery by printed code, end to end in a real browser.
 *
 * The recovery code is the only way back into encrypted content when the
 * passphrase is gone, so the path has to work against real IndexedDB: the code
 * must re-derive the same key ring, prove itself against a stored ciphertext
 * row, and re-seat the account root in the device vault. A unit test cannot
 * show the last part — the vault lives in its own database and is written as a
 * side effect of the recovery flow the UI drives.
 */

const PASSPHRASE = 'a-strong-passphrase';

/** Set up encryption and return the one-time recovery code it prints. */
const setUpEncryption = async (
  page: import('@playwright/test').Page,
): Promise<string> => {
  await page.getByTestId('cloud-setup').click();
  await page.getByTestId('passphrase-input').fill(PASSPHRASE);
  await page.getByTestId('passphrase-confirm').fill(PASSPHRASE);
  await page.getByTestId('passphrase-submit').click();
  await expect(page.getByTestId('recovery-code-dialog')).toBeVisible();
  const code = (await page.getByTestId('recovery-code').textContent()) ?? '';
  await page.getByTestId('recovery-confirm').click();
  await page.getByTestId('recovery-done').click();
  return code.trim();
};

/** Enter a code through the unlock dialog's recovery mode. */
const recoverWith = async (
  page: import('@playwright/test').Page,
  code: string,
): Promise<void> => {
  await page.getByTestId('cloud-unlock').click();
  await page.getByTestId('unlock-use-recovery').click();
  await expect(page.getByTestId('unlock-input')).toHaveAccessibleName(
    /Recovery code/i,
  );
  await page.getByTestId('unlock-input').fill(code);
  await page.getByTestId('unlock-submit').click();
};

test.describe('recovery by printed code', () => {
  test('restores the key on a forgotten device and reopens sealed content', async ({
    page,
  }) => {
    await page.goto('/?cloud-sync=on&reseed=1#/settings?tab=cloudSync');
    await expect(page.getByTestId('cloud-section')).toBeVisible();
    const code = await setUpEncryption(page);
    expect(code).not.toHaveLength(0);

    // Forget the device: the key ring and the vault's account root both go, so
    // recovery has to rebuild them from the code alone.
    await page.getByTestId('cloud-forget').click();
    await expect(page.getByTestId('cloud-setup')).toBeVisible();

    await recoverWith(page, code);

    // Back to the keyed state — the keyless actions are gone.
    await expect(page.getByTestId('cloud-forget')).toBeVisible();
    await expect(page.getByTestId('cloud-setup')).toHaveCount(0);

    // The rows sealed before the device was forgotten open again: a wrong key
    // would decrypt to nothing and Home would render no space at all.
    await page.goto('/#/');
    await expect(page.getByRole('link', { name: /Continue writing/i })).toBeVisible();
    const { docId } = await gotoFirstDoc(page);
    expect(docId).toBeTruthy();
  });

  test('rejects a code that does not match the account key', async ({ page }) => {
    await page.goto('/?cloud-sync=on&reseed=1#/settings?tab=cloudSync');
    await expect(page.getByTestId('cloud-section')).toBeVisible();
    const code = await setUpEncryption(page);
    await page.getByTestId('cloud-forget').click();
    await expect(page.getByTestId('cloud-setup')).toBeVisible();

    // Same shape and checksum, different secret: only a real decrypt attempt
    // can tell the two apart, which is the point of the check.
    const wrong = code.replace(/[A-Za-z0-9]/, (character) =>
      character === 'A' ? 'B' : 'A',
    );
    await recoverWith(page, wrong);

    await expect(page.getByTestId('unlock-error')).toBeVisible();
    // The device stays keyless rather than half-recovered.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('cloud-setup')).toBeVisible();
  });
});
