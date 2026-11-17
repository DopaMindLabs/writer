import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { openCoveredContext } from './_helpers';
import { pair, walkToVerification } from './_pairing';

/**
 * A pairing whose window closes between the codes being shown and the digits
 * being confirmed.
 *
 * The step with no clock on it is the human one: two people compare six digits
 * on two screens, and nothing hurries them. The credential that carries the
 * account key is deliberately short-lived, so that step is exactly where a
 * pairing runs out of time — and the failure it produces is the one that must
 * never look like success. `pair-again.spec.ts` covers the pairing that
 * finishes; this covers the one that does not, both for a device this one has
 * never met and for a device it has removed.
 *
 * Only the device holding the account key can be too late, because it is the
 * one asked to seal it. So this device is given a key of its own first rather
 * than leaving which end seals it to a comparison of two device ids.
 */

const PASSPHRASE = 'a-strong-passphrase';

/** Long enough to outlive the pairing window it is measured against. */
const PAST_THE_WINDOW_MILLIS = 6 * 60 * 1000;

const EXPIRY_TIMEOUT = 30_000;

interface TrustRecord {
  deviceId: string;
  status: string;
  revokedAt?: number;
}

/** Set up encryption, so this device holds the account key the pairing carries. */
const holdAnAccountKey = async (page: Page): Promise<void> => {
  await page.getByTestId('cloud-setup').click();
  await page.getByTestId('passphrase-input').fill(PASSPHRASE);
  await page.getByTestId('passphrase-confirm').fill(PASSPHRASE);
  await page.getByTestId('passphrase-submit').click();
  await expect(page.getByTestId('recovery-code-dialog')).toBeVisible();
  await page.getByTestId('recovery-confirm').click();
  await page.getByTestId('recovery-done').click();
};

/** What this device's trust registry holds, read through the app's own handle. */
const trustRecords = (page: Page): Promise<TrustRecord[]> =>
  page.evaluate(async () => {
    const { db } = window as unknown as {
      db?: { trustedDevices?: { toArray: () => Promise<TrustRecord[]> } };
    };
    if (!db?.trustedDevices) throw new Error('the app database is not exposed');
    return db.trustedDevices.toArray();
  });

const statusOn = async (page: Page): Promise<string | undefined> =>
  (await trustRecords(page))[0]?.status;

/** How many pieces of key material this device is still holding. */
const heldKeyMaterial = (page: Page): Promise<number> =>
  page.evaluate(async () => {
    const count = (database: string, store: string): Promise<number> =>
      new Promise<number>((resolve, reject) => {
        const opened = indexedDB.open(database);
        opened.onerror = () => {
          reject(opened.error ?? new Error(`cannot open ${database}`));
        };
        opened.onsuccess = () => {
          const handle = opened.result;
          const request = handle.transaction(store, 'readonly').objectStore(store).count();
          request.onsuccess = () => {
            const held = request.result;
            handle.close();
            resolve(held);
          };
          request.onerror = () => {
            reject(request.error ?? new Error(`cannot count ${store}`));
          };
        };
      });
    return (
      (await count('lipsum-device-vault', 'vault')) +
      (await count('lipsum-cloud-keystore', 'rings'))
    );
  });

/**
 * Put a device back where one that has never held a key stands.
 *
 * Its signing identity stays, deliberately: the peer's record is filed under
 * that id, and a device with a new one would be a new device rather than the
 * one that was removed. Without this a returning device keeps the key it was
 * handed, is never asked for another, and so can never be too late to seal one.
 */
const forgetKeyMaterial = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    const clear = (database: string, store: string): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        const opened = indexedDB.open(database);
        opened.onerror = () => {
          reject(opened.error ?? new Error(`cannot open ${database}`));
        };
        opened.onsuccess = () => {
          const handle = opened.result;
          const transaction = handle.transaction(store, 'readwrite');
          transaction.objectStore(store).clear();
          transaction.oncomplete = () => {
            handle.close();
            resolve();
          };
          transaction.onerror = () => {
            reject(transaction.error ?? new Error(`cannot clear ${store}`));
          };
        };
      });
    // The vault's other table is the identity, and it is left alone.
    await clear('lipsum-device-vault', 'vault');
    await clear('lipsum-cloud-keystore', 'rings');
  });
  // Read back before reloading. A reload landing on top of these writes takes
  // them with it, and the device comes back still holding the key it was meant
  // to have given up — which reads as a pairing that simply did not expire.
  await expect
    .poll(() => heldKeyMaterial(page), {
      message: 'the device kept the key material it was meant to give up',
    })
    .toBe(0);
  await page.reload();
};

/** Take the digits as read, too late for the device that seals the key. */
const confirmPastTheWindow = async (showing: Page, reading: Page): Promise<void> => {
  // Only the wall clock moves — every timer keeps running, so what expires is
  // the deadline and not the exchange that has to notice it.
  await showing.clock.setFixedTime(new Date(Date.now() + PAST_THE_WINDOW_MILLIS));
  await showing.getByTestId('pairing-verification-confirm').click();
  await reading.getByTestId('pairing-verification-confirm').click();
  await expect(showing.getByTestId('pair-device-expired')).toBeVisible({
    timeout: EXPIRY_TIMEOUT,
  });
};

test('a pairing confirmed too late transfers nothing and leaves no trust', async ({
  page,
  browser,
  browserName,
}) => {
  // A full pairing exchange, and a wait built into it.
  test.setTimeout(120_000);
  await page.goto('/?cloud-sync=on&reseed=1#/settings?tab=cloudSync');
  await holdAnAccountKey(page);

  const peer = await openCoveredContext(browser, browserName);
  await peer.goto('/#/');

  await walkToVerification(page, peer);
  await confirmPastTheWindow(page, peer);

  // The pairing says what happened. A dialog reporting "Devices paired" over a
  // handover that never ran is the one outcome this must not produce.
  await expect(page.getByTestId('pair-device-complete')).toHaveCount(0);

  // And leaves nothing behind. Trust recorded on the strength of a handover
  // that never happened would have this device vouching for a peer that holds
  // none of its keys — and the device list showing it as though it did.
  await expect
    .poll(async () => (await trustRecords(page)).length, {
      message: 'the expired pairing left a trusted device behind',
      timeout: EXPIRY_TIMEOUT,
    })
    .toBe(0);

  await page.keyboard.press('Escape');
  await page.goto('/#/settings?tab=deviceSync');
  await expect(page.locator('[data-testid^="trusted-device-remove-"]')).toHaveCount(0);
});

test('a re-pairing confirmed too late leaves a removed device removed', async ({
  page,
  browser,
  browserName,
}) => {
  // Three exchanges: one that pairs, one that runs out of time, one that puts
  // it right.
  test.setTimeout(240_000);
  await page.goto('/?cloud-sync=on&reseed=1#/settings?tab=cloudSync');
  await holdAnAccountKey(page);

  const peer = await openCoveredContext(browser, browserName);
  await peer.goto('/#/');

  await pair(page, peer);
  await page.keyboard.press('Escape');
  await peer.keyboard.press('Escape');
  await forgetKeyMaterial(peer);

  // The user removes it. The record is kept, badged as removed, because a
  // relationship that existed is a fact worth keeping.
  await page.goto('/#/settings?tab=deviceSync');
  await page.locator('[data-testid^="trusted-device-remove-"]').first().click();
  await expect(page.getByText('Removed', { exact: true })).toBeVisible();
  const [removed] = await trustRecords(page);
  expect(removed.status).toBe('revoked');
  expect(removed.revokedAt).toEqual(expect.any(Number));

  // They think better of it — and then take too long over the digits. Trust is
  // recorded when the codes are confirmed, so by now the record has already
  // been reactivated on the strength of a handover that is about to fail.
  await walkToVerification(page, peer);
  await confirmPastTheWindow(page, peer);

  // A removal is undone by a pairing that finished. This one did not, so the
  // device is still removed — on the date it was removed, not a fresh one, and
  // under the identity it always had.
  await expect
    .poll(() => statusOn(page), {
      message: 'the expired re-pairing left the removed device active',
      timeout: EXPIRY_TIMEOUT,
    })
    .toBe('revoked');
  const [afterExpiry] = await trustRecords(page);
  expect(afterExpiry.revokedAt).toBe(removed.revokedAt);
  expect(afterExpiry.deviceId).toBe(removed.deviceId);

  await page.keyboard.press('Escape');
  await peer.keyboard.press('Escape');
  await page.goto('/#/settings?tab=deviceSync');
  await expect(page.getByText('Removed', { exact: true })).toBeVisible();

  // And putting it back is still the ordinary walk. Nothing the expired attempt
  // left behind stands in the way of the one that finishes.
  //
  // The clock comes back with them: it was moved to make one pairing too late,
  // and a device left running ahead of its peer would refuse the reply to this
  // one as well — for the same reason, at the wrong moment.
  await page.clock.setFixedTime(new Date());
  await pair(page, peer);
  await expect
    .poll(() => statusOn(page), {
      message: 'the pairing that finished did not undo the removal',
      timeout: EXPIRY_TIMEOUT,
    })
    .toBe('active');
  const [restored] = await trustRecords(page);
  expect(restored.revokedAt).toBeUndefined();
  expect(restored.deviceId).toBe(removed.deviceId);

  await page.keyboard.press('Escape');
  await page.goto('/#/settings?tab=deviceSync');
  await expect(page.getByText('Removed', { exact: true })).toHaveCount(0);
});
