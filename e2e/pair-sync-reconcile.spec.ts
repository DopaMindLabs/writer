import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { openCoveredContext, reseedAndGoHome } from './_helpers';
import { pair } from './_pairing';

/**
 * What two paired devices owe each other once both are being written on.
 *
 * `pair-sync.spec.ts` proves a transfer happens at all, in one direction, with
 * one device empty — the easy case, because there is nothing to reconcile. Here
 * both devices already hold writing, both add to it, and one takes something
 * away, which is the shape of a real session rather than a first pairing.
 *
 * Both devices stay connected throughout, so what is proven is the live path:
 * a row journalled on one device reaching the other as it is written. Reconciling
 * the same work through *catch-up* — the devices apart while it happens, then
 * brought back together — needs a session torn down and rebuilt mid-test, and is
 * not covered here.
 */

/** Key transfer, then catch-up, then materialisation — all across a connection. */
const SYNC_TIMEOUT = 30_000;

/** Persistent chrome, so it can be read without navigating anywhere. */
const spaceRail = (page: Page) => page.locator('[data-testid^="space-rail-space-"]');

/** Make a space from the templates screen, and return the id it was given. */
const addSpace = async (page: Page, name: string): Promise<string> => {
  await page.goto('/#/new');
  await expect(page.locator('[data-testid^="templates-card-"]').first()).toBeVisible();
  await page.getByTestId('templates-name-input').fill(name);
  await page.getByTestId('templates-submit').click();
  await page.waitForURL(/#\/s\//);
  const spaceId = new URL(page.url()).hash.match(/\/s\/([^/?#]+)/)?.[1];
  if (spaceId === undefined) throw new Error(`no space id in ${page.url()}`);
  return spaceId;
};

/** Delete a space the way a person does: the danger tab, and its name typed out. */
const deleteSpace = async (page: Page, spaceId: string, name: string): Promise<void> => {
  await page.goto(`/#/s/${spaceId}/settings?tab=danger`);
  await expect(page.getByTestId('space-settings-tab-danger')).toBeVisible();
  await page.getByTestId('space-settings-danger-delete-trigger').click();
  await page.getByTestId('space-settings-delete-dialog-input').fill(name);
  await page.getByTestId('space-settings-delete-dialog-confirm').click();
};

test('spaces made on both devices reach the other one', async ({
  page,
  browser,
  browserName,
}) => {
  const second = await openCoveredContext(browser, browserName);
  await reseedAndGoHome(page);
  await second.goto('/#/');

  await pair(page, second);
  // The seeded writing crosses first; everything after it is the actual subject.
  await expect(spaceRail(second).first()).toBeVisible({ timeout: SYNC_TIMEOUT });
  const held = await spaceRail(page).count();

  // Each device makes something of its own. The device that scanned is the one
  // that used to be stranded: it could only wait for a channel its peer had no
  // reason to open, so its work never left it while the pair looked synced.
  await addSpace(page, 'Alpha from A');
  await addSpace(second, 'Beta from B');

  await expect(spaceRail(page)).toHaveCount(held + 2, { timeout: SYNC_TIMEOUT });
  await expect(spaceRail(second)).toHaveCount(held + 2, { timeout: SYNC_TIMEOUT });
});

test('a space deleted on one device stops existing on the other', async ({
  page,
  browser,
  browserName,
}) => {
  const second = await openCoveredContext(browser, browserName);
  await reseedAndGoHome(page);
  await second.goto('/#/');

  await pair(page, second);
  await expect(spaceRail(second).first()).toBeVisible({ timeout: SYNC_TIMEOUT });
  const held = await spaceRail(second).count();

  const doomed = await addSpace(page, 'Doomed');
  await expect(spaceRail(second)).toHaveCount(held + 1, { timeout: SYNC_TIMEOUT });

  // Deleting takes away every row the scope had. What travels is a tombstone,
  // and the peer has to act on it rather than keep what it was given earlier.
  await deleteSpace(page, doomed, 'Doomed');

  await expect(spaceRail(second)).toHaveCount(held, { timeout: SYNC_TIMEOUT });
});

/** What deletion state this device is still holding, read through the app's handle. */
const heldDeletions = (page: Page): Promise<number> =>
  page.evaluate(async () => {
    const { db } = window as unknown as {
      db?: { syncTombstones?: { count: () => Promise<number> } };
    };
    if (!db?.syncTombstones) throw new Error('the app database is not exposed');
    return db.syncTombstones.count();
  });

test('removing the last device lets go of the deletions kept for it', async ({
  page,
  browser,
  browserName,
}) => {
  // Pairing twice over is the expensive part of this file, and this test only
  // needs one.
  test.setTimeout(120_000);
  const second = await openCoveredContext(browser, browserName);
  await reseedAndGoHome(page);
  await second.goto('/#/');

  await pair(page, second);
  await expect(spaceRail(second).first()).toBeVisible({ timeout: SYNC_TIMEOUT });
  const held = await spaceRail(second).count();

  const doomed = await addSpace(page, 'Doomed');
  await expect(spaceRail(second)).toHaveCount(held + 1, { timeout: SYNC_TIMEOUT });
  await deleteSpace(page, doomed, 'Doomed');
  await expect(spaceRail(second)).toHaveCount(held, { timeout: SYNC_TIMEOUT });

  // A deletion is kept until every paired device has confirmed it, with no
  // window that would ever take it: this device is holding that state now.
  await expect.poll(() => heldDeletions(page)).toBeGreaterThan(0);

  // Sync boot compacts the journal, which is where a deletion every device has
  // confirmed is let go of. This one has been confirmed by the only peer there
  // is, so the reload is what should release it.
  // Deleting the space left this device on the settings screen of a space that
  // no longer exists; the device list is somewhere else entirely. Loading it
  // afresh is also what boots sync again, and boot is when the journal is
  // compacted.
  await page.goto('/#/settings?tab=deviceSync');
  await page.reload();
  await page.locator('[data-testid^="trusted-device-remove-"]').first().click();
  await expect(page.getByText('Removed', { exact: true })).toBeVisible();

  // Removing the device is the release valve. With nobody left to confirm the
  // deletion, what was being held is held for no one.
  await expect
    .poll(() => heldDeletions(page), {
      message: 'removing the last device did not release its deletion state',
    })
    .toBe(0);
});
