import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

/**
 * What a user sees when a paired device's link comes up and goes down.
 *
 * The link itself is driven through the build's own test seam
 * (`window.peerLink`, dev and E2E builds only): a genuine WebRTC drop takes
 * minutes of ICE re-checks to declare itself, so waiting for one would test this
 * path once and never in the states around it. Everything downstream of the
 * faked browser event is real — the session registry, the link store, the
 * device list and the notice. `pair-device-drop.spec.ts` covers a real drop.
 */

const PEER = 'e2e-peer-device';

interface PeerLinkSeam {
  connect: (deviceId: string) => void;
  drop: (deviceId: string) => void;
  restore: (deviceId: string) => void;
}

const seam = (page: Page, action: keyof PeerLinkSeam): Promise<void> =>
  page.evaluate(
    ([name, deviceId]) => {
      const peerLink = (window as unknown as { peerLink?: PeerLinkSeam }).peerLink;
      if (!peerLink) throw new Error('the peer link seam is not installed');
      peerLink[name as keyof PeerLinkSeam](deviceId as string);
    },
    [action, PEER] as const,
  );

/** A device in the trusted list, so there is a row for a link state to land on. */
const seedTrustedDevice = async (page: Page): Promise<void> => {
  await page.evaluate(async (deviceId: string) => {
    const scoped = window as unknown as {
      db: {
        meta: { get: (key: string) => Promise<{ value?: { authorId?: string } } | undefined> };
        trustedDevices: { put: (row: unknown) => Promise<unknown> };
      };
    };
    const profile = await scoped.db.meta.get('profile');
    await scoped.db.trustedDevices.put({
      deviceId,
      publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'aQ', y: 'ag' },
      principalId: profile?.value?.authorId ?? '',
      addedAt: Date.now(),
      displayName: 'Bench phone',
      status: 'active',
      acknowledgedOperations: {},
    });
  }, PEER);
};

const openDeviceSync = async (page: Page): Promise<void> => {
  await page.goto('/#/settings?tab=deviceSync');
  await expect(page.getByTestId('setting-pair-device')).toBeVisible();
};

test('a device list says which devices this browser is connected to', async ({ page }) => {
  await reseedAndGoHome(page);
  await seedTrustedDevice(page);
  await openDeviceSync(page);

  const row = page.getByTestId(`trusted-device-${PEER}`);
  await expect(row).toBeVisible();
  // No session survives a reload, so a freshly opened page reaches nothing — and
  // says so, rather than leaving a paired device looking ready to sync.
  await expect(page.getByTestId('device-link-idle')).toBeVisible();
  await expect(page.getByTestId('device-link-connected')).toHaveCount(0);

  await seam(page, 'connect');

  await expect(page.getByTestId('device-link-connected')).toBeVisible();
});

test('a link that drops is marked, with a way back that names the device', async ({
  page,
}) => {
  await reseedAndGoHome(page);
  await seedTrustedDevice(page);
  await openDeviceSync(page);
  await seam(page, 'connect');
  await expect(page.getByTestId('device-link-connected')).toBeVisible();

  await seam(page, 'drop');

  await expect(page.getByTestId('device-link-dropped')).toBeVisible();
  // Named, so a list of several devices offers several distinguishable actions.
  const reconnect = page.getByRole('button', { name: 'Reconnect Bench phone' });
  await expect(reconnect).toBeVisible();

  await reconnect.click();

  // The way back is a fresh exchange: there is no signalling channel left to
  // renegotiate over.
  await expect(page.getByRole('dialog', { name: 'Pair another device' })).toBeVisible();
});

test('the badge clears when the device comes back', async ({ page }) => {
  await reseedAndGoHome(page);
  await seedTrustedDevice(page);
  await openDeviceSync(page);
  await seam(page, 'connect');
  await seam(page, 'drop');
  await expect(page.getByTestId('device-link-dropped')).toBeVisible();

  await seam(page, 'restore');

  await expect(page.getByTestId('device-link-connected')).toBeVisible();
  await expect(page.getByTestId('device-link-dropped')).toHaveCount(0);
});

test('a drop while writing is shown without interrupting the writing', async ({
  page,
}) => {
  await reseedAndGoHome(page);
  await seedTrustedDevice(page);
  await seam(page, 'connect');
  // Nothing to say while the link is up, on any screen.
  await expect(page.getByTestId('peer-link-notice')).toHaveCount(0);

  await seam(page, 'drop');

  const notice = page.getByTestId('peer-link-notice');
  await expect(notice).toBeVisible();
  // Announced politely and never modal: nothing to dismiss before carrying on.
  await expect(notice).toHaveRole('status');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Open device sync' }).click();

  await expect(page.getByTestId('setting-pair-device')).toBeVisible();
});

test('a page that has connected to nothing raises no alarm, but offers a way on', async ({
  page,
}) => {
  // The resting state on every app start: nothing was lost, so nothing
  // interrupts — but the device list still says where things stand and how to
  // get connected, which is all a reopened page can offer.
  await reseedAndGoHome(page);
  await seedTrustedDevice(page);

  await seam(page, 'drop');

  await expect(page.getByTestId('peer-link-notice')).toHaveCount(0);
  await openDeviceSync(page);
  await expect(page.getByTestId('device-link-dropped')).toHaveCount(0);
  await expect(page.getByTestId('device-link-idle')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Reconnect Bench phone' }),
  ).toBeVisible();
});
