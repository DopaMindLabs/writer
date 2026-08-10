import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';

/**
 * The account device identity registry, driven end to end in a real browser.
 *
 * Publication is gated on state only a completed sign-in produces — an account,
 * a settled initial pull, a ring bound to that account and matching the
 * account's escrow — so the `?cloud-devices=registrar` affordance stands in for
 * it and the **real** publication path runs: the escrow reconciler publishes
 * this device's held-back escrow and claims its ring for the account, and the
 * identity registrar then seals one record through the encryption middleware.
 *
 * What only a real browser can prove is the at-rest shape: these read the
 * stored rows straight from IndexedDB, past Dexie and the middleware, so a
 * regression that leaked the signing identity into plaintext would be caught
 * where `fake-indexeddb` cannot see it.
 */

const PASSPHRASE = 'a-strong-passphrase';
const CLOUD_REGISTRAR = '/?cloud-sync=on&cloud-devices=registrar#/settings?tab=cloudSync';

type RawRow = Record<string, unknown>;

/** Set up encryption so the device holds a key and a publishable escrow. */
const setUpEncryption = async (page: Page): Promise<void> => {
  await page.getByTestId('cloud-setup').click();
  await page.getByTestId('passphrase-input').fill(PASSPHRASE);
  await page.getByTestId('passphrase-confirm').fill(PASSPHRASE);
  await page.getByTestId('passphrase-submit').click();
  await expect(page.getByTestId('recovery-code-dialog')).toBeVisible();
  await page.getByTestId('recovery-confirm').click();
  await page.getByTestId('recovery-done').click();
};

/**
 * Mint the key on a clean, signed-out device. The passphrase actions live in
 * the signed-out panel — once a device reports as signed in, the presence-gated
 * keyless section is the single source of key actions — so setup precedes the
 * account state rather than following it, exactly as the first device's own
 * ordering does.
 */
const setUpOnCleanDevice = async (page: Page): Promise<void> => {
  await page.goto('/?cloud-sync=on&reseed=1#/settings?tab=cloudSync');
  await expect(page.getByTestId('cloud-section')).toBeVisible();
  await setUpEncryption(page);
};

/**
 * The registry rows exactly as stored — read through the browser's own
 * IndexedDB API, so neither Dexie nor the encryption middleware can decrypt
 * them on the way out.
 */
const storedIdentityRows = (page: Page): Promise<RawRow[]> =>
  page.evaluate(async () => {
    // The database the app actually opened — the cloud instance carries its own
    // name, and the suite's `window.db` handle is the sanctioned way to learn it.
    const appDb = (window as unknown as { db?: { name?: string } }).db;
    const request = indexedDB.open(appDb?.name ?? 'lipsum');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!database.objectStoreNames.contains('accountDeviceIdentities')) {
      database.close();
      return [];
    }
    const store = database
      .transaction('accountDeviceIdentities', 'readonly')
      .objectStore('accountDeviceIdentities');
    const read = store.getAll();
    const rows = await new Promise<unknown[]>((resolve, reject) => {
      read.onsuccess = () => resolve(read.result);
      read.onerror = () => reject(read.error);
    });
    database.close();
    return rows as Record<string, unknown>[];
  });

/**
 * Boot the device with the account state the registrar gates on. Within this
 * one load the escrow reconciler publishes the held-back escrow and claims the
 * ring for the account, and that claim is what makes the identity registrar
 * eligible — so a first-ever device settles without waiting for a second round.
 */
const settleAccountState = async (page: Page): Promise<void> => {
  await page.goto(CLOUD_REGISTRAR);
  await expect(page.getByTestId('cloud-section')).toBeVisible();
};

test.describe('account device identity registry', () => {
  test('publishes one sealed identity once the account key is authoritative', async ({
    page,
  }) => {
    await setUpOnCleanDevice(page);
    await settleAccountState(page);

    await expect
      .poll(async () => (await storedIdentityRows(page)).length, {
        message: 'the registrar publishes exactly one identity record',
      })
      .toBe(1);

    const [row] = await storedIdentityRows(page);
    // Routing metadata is plaintext by design: the provider must address the
    // row, and the pseudonymous device id already travels in every frame's
    // header.
    expect(String(row.id)).toMatch(/^#writer-device:/);
    expect(row.accessScopeId).toBe('account');
    expect(row.$lipsumCipher).toBeDefined();
    // Everything that states an identity is sealed.
    expect(row.deviceId).toBeUndefined();
    expect(row.publicIdentityJwk).toBeUndefined();
    expect(row.authorisedAt).toBeUndefined();
    // Not merely absent as named fields: no key material survives anywhere in
    // the stored row (an EC public JWK would carry its curve and coordinates).
    const serialised = JSON.stringify(row);
    expect(serialised).not.toContain('P-256');
    expect(serialised).not.toContain('"crv"');
    expect(serialised).not.toContain('"x"');
  });

  test('a settled account performs no further write', async ({ page }) => {
    await setUpOnCleanDevice(page);
    await settleAccountState(page);
    await expect.poll(async () => (await storedIdentityRows(page)).length).toBe(1);
    const published = JSON.stringify((await storedIdentityRows(page))[0].$lipsumCipher);

    // Forget the key and unlock again with the passphrase — the same device,
    // back through the account's now-published escrow. That re-run finds its
    // own record and must leave it exactly as it was: a re-seal would mint a
    // fresh IV, so byte-identical ciphertext is what proves no second write,
    // and no second write is what keeps the registry out of a write/sync/write
    // loop.
    await page.getByTestId('cloud-forget').click();
    // Signed in without a key, the presence-gated keyless section is the single
    // source of key actions, and the account escrow this device published is
    // what it offers to unlock against.
    const keylessUnlock = page.getByTestId('cloud-keyless-locked');
    await expect(keylessUnlock).toBeVisible();
    await keylessUnlock.getByRole('button', { name: /unlock/i }).click();
    await page.getByTestId('unlock-input').fill(PASSPHRASE);
    await page.getByTestId('unlock-submit').click();
    await expect(page.getByTestId('passphrase-unlock-dialog')).toHaveCount(0);

    await expect
      .poll(async () => (await storedIdentityRows(page)).length)
      .toBe(1);
    const rows = await storedIdentityRows(page);
    expect(JSON.stringify(rows[0].$lipsumCipher)).toBe(published);
  });

  test('a keyless device publishes no identity at all', async ({ page }) => {
    // Signed in with the account state settled, but never set up: there is no
    // key to seal a record with, and an unsealed identity is an unauthenticated
    // claim rather than something to store.
    await page.goto('/?cloud-sync=on&reseed=1#/settings?tab=cloudSync');
    await expect(page.getByTestId('cloud-section')).toBeVisible();
    await settleAccountState(page);

    expect(await storedIdentityRows(page)).toEqual([]);
  });
});
