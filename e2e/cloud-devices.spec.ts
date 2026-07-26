import { test, expect } from './_helpers';
import { expectNoA11yViolations } from './_helpers';

// Colour-contrast is asserted only in the high-contrast themes across the suite.
const STRUCTURE_ONLY = { disableRules: ['color-contrast'] };

const PASSPHRASE = 'a-strong-passphrase';

/** One registry row, as read back from the page's own database. */
interface RegistryRow {
  id: string;
  lastSeenAt: number;
}

declare global {
  interface Window {
    db: {
      cloudDevices: { toArray: () => Promise<RegistryRow[]> };
    };
  }
}

/**
 * Mint a device key through the ordinary setup flow. A signed-in device with no key
 * yet is offered setup from the keyless banner rather than the controls row.
 */
const setUpEncryption = async (page: import('@playwright/test').Page) => {
  await page.getByTestId('cloud-keyless-nokey').getByRole('button').click();
  await page.getByTestId('passphrase-input').fill(PASSPHRASE);
  await page.getByTestId('passphrase-confirm').fill(PASSPHRASE);
  await page.getByTestId('passphrase-submit').click();
  await expect(page.getByTestId('recovery-code-dialog')).toBeVisible();
  await page.getByTestId('recovery-confirm').click();
  await page.getByTestId('recovery-done').click();
};

/**
 * The device list needs a completed sign-in — an account, a minted client identity,
 * a settled pull — none of which a headless run can reach, since no OTP ever
 * arrives. `?cloud-devices=list` seeds a registry covering every row state and
 * forces the list open, so the real components are exercised against real rows.
 *
 * The sync loop this feature was built to fix cannot be reproduced here at all:
 * against `cloud.example.invalid` no sync round ever settles, so the registrar's
 * write path never runs. That regression is held by the unit test asserting no
 * write is attempted, and end-to-end only by the real-account harness.
 */
const LIST = '/?cloud-sync=on&reseed=1&cloud-devices=list#/settings?tab=account';

const openDeviceList = async (page: import('@playwright/test').Page) => {
  await page.goto(LIST);
  await expect(page.getByTestId('cloud-device-list')).toBeVisible();
};

test.describe('cloud sync device list', () => {
  test('lists the account’s devices and counts only the live slots', async ({ page }) => {
    await openDeviceList(page);

    const list = page.getByTestId('cloud-device-list');
    await expect(list.getByTestId('cloud-device-preview-this-device')).toBeVisible();
    await expect(list.getByTestId('cloud-device-preview-live-peer')).toBeVisible();
    await expect(list.getByTestId('cloud-device-preview-stale-peer')).toBeVisible();

    // A tombstoned device has already given its slot back: it is gone from the list,
    // and — with a stale peer also not counting — only two of the four are in use.
    await expect(list.getByTestId('cloud-device-preview-revoked-peer')).toHaveCount(0);
    await expect(list).toContainText(/2 of 4 devices in use/i);
  });

  test('badges this device and marks a quiet one inactive', async ({ page }) => {
    await openDeviceList(page);

    const own = page.getByTestId('cloud-device-preview-this-device');
    await expect(own.getByTestId('cloud-device-badge-current')).toBeVisible();

    const stale = page.getByTestId('cloud-device-preview-stale-peer');
    await expect(stale.getByTestId('cloud-device-badge-stale')).toBeVisible();
  });

  test('offers sign-out here and frees only the slot on every other device', async ({
    page,
  }) => {
    await openDeviceList(page);

    // Freeing your own row is meaningless — this device holds the session and the
    // registrar would rejoin it — so the row offers sign-out instead.
    const own = page.getByTestId('cloud-device-preview-this-device');
    await expect(own.getByTestId('cloud-device-sign-out')).toBeVisible();
    await expect(own.getByTestId('cloud-device-free-slot')).toHaveCount(0);

    const peer = page.getByTestId('cloud-device-preview-live-peer');
    await expect(peer.getByTestId('cloud-device-free-slot')).toBeVisible();
    await expect(peer.getByTestId('cloud-device-sign-out')).toHaveCount(0);
  });

  test('freeing a peer slot explains that the peer may keep syncing', async ({ page }) => {
    await openDeviceList(page);
    const list = page.getByTestId('cloud-device-list');
    await expect(list).toContainText(/2 of 4 devices in use/i);

    await page
      .getByTestId('cloud-device-preview-live-peer')
      .getByTestId('cloud-device-free-slot')
      .click();

    // Reaching across to another machine takes a deliberate second step.
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await expect(page.getByTestId('confirm-dialog')).toContainText(
      /does not sign that device out or stop it syncing/i,
    );
    await page.getByRole('button', { name: /Free slot/i }).click();

    await expect(list.getByTestId('cloud-device-preview-live-peer')).toHaveCount(0);
    await expect(list).toContainText(/1 of 4 devices in use/i);
  });

  test('dismissing the confirmation leaves the device alone', async ({ page }) => {
    await openDeviceList(page);

    await page
      .getByTestId('cloud-device-preview-live-peer')
      .getByTestId('cloud-device-free-slot')
      .click();
    await page.getByRole('button', { name: /Cancel/i }).click();

    await expect(page.getByTestId('cloud-device-preview-live-peer')).toBeVisible();
    await expect(page.getByTestId('cloud-device-list')).toContainText(
      /2 of 4 devices in use/i,
    );
  });

  test('the device list has no accessibility violations', async ({ page }) => {
    await openDeviceList(page);
    await expectNoA11yViolations(page, {
      context: '[data-testid="cloud-device-list"]',
      ...STRUCTURE_ONLY,
    });
  });
});

test.describe('cloud sync device slot freed elsewhere', () => {
  test('the banner states that this device remains signed in', async ({
    page,
  }) => {
    await page.goto('/?cloud-sync=on&reseed=1&cloud-devices=revoked#/settings?tab=account');
    const banner = page.getByTestId('cloud-device-revoked');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/still signed in and may keep syncing/i);
  });
});

/**
 * The registrar's write path is what the sync loop lived in, so it is worth driving
 * against the real Dexie rather than only a fake. `?cloud-devices=registrar` stands
 * in for the account state it gates on (a signed-in user, a settled pull, a client
 * identity); acquiring a key through the ordinary setup flow then triggers a real
 * run, because the registrar re-runs on every device-key change.
 */
const REGISTRAR =
  '/?cloud-sync=on&reseed=1&cloud-devices=registrar#/settings?tab=account';

/** The registry, read straight from IndexedDB — the source of truth the UI renders. */
const readRegistry = (page: import('@playwright/test').Page) =>
  page.evaluate(async () =>
    (await window.db.cloudDevices.toArray()).map((row) => ({
      id: String(row.id),
      lastSeenAt: row.lastSeenAt,
    })),
  );

test.describe('cloud sync device registrar', () => {
  test('registers this device and reclaims a dead slot', async ({ page }) => {
    await page.goto(REGISTRAR);
    await expect(page.getByTestId('cloud-section')).toBeVisible();

    // Acquiring a key is what lets the registrar run at all.
    await setUpEncryption(page);

    await expect(async () => {
      const ids = (await readRegistry(page)).map((row) => row.id);
      // This device takes a slot…
      expect(ids).toContain('preview-this-device');
      // …and the dead one gives its slot back. A wiped browser profile must not
      // hold a slot for ever: four of those locked the beta account out entirely.
      expect(ids).not.toContain('preview-stale-peer');
    }).toPass();
  });

  // The loop itself is deliberately NOT asserted here. Against
  // cloud.example.invalid no sync round ever settles, so nothing re-triggers the
  // registrar and a "did it write again?" check would pass without ever exercising
  // the behaviour. It is held by the put-call-count unit test, and end to end only
  // by the real-account harness (`npm run cloud:harness`).
});
