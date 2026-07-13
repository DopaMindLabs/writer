import { test, expect } from './_helpers';
import { expectNoA11yViolations } from './_helpers';

// Colour-contrast is asserted only in the high-contrast themes across the suite.
const STRUCTURE_ONLY = { disableRules: ['color-contrast'] };

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

    // A revoked device has already given its slot back: it is gone from the list,
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

  test('offers sign-out on this device and revoke on every other', async ({ page }) => {
    await openDeviceList(page);

    // Revoking your own row is meaningless — this device holds the session and the
    // registrar would rejoin it — so the row offers sign-out instead.
    const own = page.getByTestId('cloud-device-preview-this-device');
    await expect(own.getByTestId('cloud-device-sign-out')).toBeVisible();
    await expect(own.getByTestId('cloud-device-revoke')).toHaveCount(0);

    const peer = page.getByTestId('cloud-device-preview-live-peer');
    await expect(peer.getByTestId('cloud-device-revoke')).toBeVisible();
    await expect(peer.getByTestId('cloud-device-sign-out')).toHaveCount(0);
  });

  test('revoking a device frees its slot, once confirmed', async ({ page }) => {
    await openDeviceList(page);
    const list = page.getByTestId('cloud-device-list');
    await expect(list).toContainText(/2 of 4 devices in use/i);

    await page
      .getByTestId('cloud-device-preview-live-peer')
      .getByTestId('cloud-device-revoke')
      .click();

    // Reaching across to another machine takes a deliberate second step.
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await page.getByRole('button', { name: /Remove device/i }).click();

    await expect(list.getByTestId('cloud-device-preview-live-peer')).toHaveCount(0);
    await expect(list).toContainText(/1 of 4 devices in use/i);
  });

  test('dismissing the confirmation leaves the device alone', async ({ page }) => {
    await openDeviceList(page);

    await page
      .getByTestId('cloud-device-preview-live-peer')
      .getByTestId('cloud-device-revoke')
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
