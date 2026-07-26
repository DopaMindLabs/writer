import { test, expect } from './_helpers';
import { getFirstSpaceIdFromHome } from './_helpers';

/**
 * The outbound half of the operation protocol, in a real browser.
 *
 * Every synced write must journal its encrypted frame in the same transaction as
 * the write itself. The unit suite proves that against fake-indexeddb; only real
 * Chromium reproduces the transaction timing the journal middleware has to
 * survive — it runs Web Crypto while a transaction is live, which is exactly the
 * situation that auto-commits a real IndexedDB transaction if the keep-alive is
 * mishandled. A silent failure here would look like "sync just never sends
 * anything", so the frames are read back out of the journal and inspected.
 */

const PASSPHRASE = 'a-strong-passphrase';

interface StoredFrame {
  operationId: string;
  accessScopeId: string;
  entityTable: string;
  entityId: string;
  kind: string;
  payload: string;
  payloadHash: string;
  createdBy?: string;
  updatedBy?: string;
}

/** Set up encryption so a content key exists to seal frame payloads with. */
const setUpEncryption = async (page: import('@playwright/test').Page) => {
  await page.getByTestId('cloud-setup').click();
  await page.getByTestId('passphrase-input').fill(PASSPHRASE);
  await page.getByTestId('passphrase-confirm').fill(PASSPHRASE);
  await page.getByTestId('passphrase-submit').click();
  await expect(page.getByTestId('recovery-code-dialog')).toBeVisible();
  await page.getByTestId('recovery-confirm').click();
  await page.getByTestId('recovery-done').click();
};

/** Read the operation journal through the database handle the app exposes to e2e. */
const readJournal = (page: import('@playwright/test').Page): Promise<StoredFrame[]> =>
  page.evaluate(async () => {
    const { db } = window as unknown as {
      db?: { syncOperations?: { toArray: () => Promise<StoredFrame[]> } };
    };
    if (!db?.syncOperations) throw new Error('the app database is not exposed');
    return db.syncOperations.toArray();
  });

/** Wait until the journal holds at least one frame, then return them. */
const waitForFrames = async (
  page: import('@playwright/test').Page,
): Promise<StoredFrame[]> => {
  await expect
    .poll(async () => (await readJournal(page)).length, {
      message: 'the operation journal never received a frame',
    })
    .toBeGreaterThan(0);
  return readJournal(page);
};

test.describe('the operation journal (real IndexedDB)', () => {
  test('journals an encrypted frame for a note created after setup', async ({ page }) => {
    const uncaught: string[] = [];
    page.on('pageerror', (error) => uncaught.push(error.message));

    // Seed straight into a cloud-enabled database, as the encrypted-reads spec
    // does: rows seeded into the plain database do not survive the addon's
    // version bump.
    await page.goto('/?cloud-sync=on&reseed=1#/settings?tab=account');
    await expect(page.getByTestId('cloud-section')).toBeVisible();
    await setUpEncryption(page);
    await page.reload();

    await page.goto('/#/');
    const spaceId = await getFirstSpaceIdFromHome(page);
    await page.goto(`/#/s/${spaceId}/brain-space`);
    await expect(page.getByTestId('brain-canvas-toolbar')).toBeVisible();

    const noteCards = page
      .getByTestId('brain-canvas-content')
      .locator(':scope > [data-testid^="brain-note-"]');
    const before = await noteCards.count();
    await page.getByTestId('brain-canvas-tool-question').click();
    await expect(noteCards).toHaveCount(before + 1);

    const frames = await waitForFrames(page);
    const note = frames.find((frame) => frame.entityTable === 'notes');
    expect(note, 'no frame was journalled for the created note').toBeDefined();
    expect(note?.kind).toBe('put');
    expect(note?.accessScopeId).toBe(spaceId);
    // The payload is opaque: content is sealed, and attribution is sealed with
    // it rather than exposed in the routing header a provider reads.
    expect(note?.payload.length).toBeGreaterThan(0);
    expect(note?.payloadHash.length).toBeGreaterThan(0);
    expect(note?.createdBy).toBeUndefined();
    expect(note?.updatedBy).toBeUndefined();

    expect(uncaught, `uncaught page errors:\n${uncaught.join('\n')}`).toEqual([]);
  });

  test('backfills frames for writing done before a passphrase existed', async ({
    page,
  }) => {
    // A keyless device has nothing to seal a payload with, so it journals
    // nothing. Setting up encryption re-seals what was written and must backfill
    // the operations for it — otherwise pre-setup writing would never replicate.
    await page.goto('/?cloud-sync=on&reseed=1#/');
    const spaceId = await getFirstSpaceIdFromHome(page);
    await page.goto(`/#/s/${spaceId}/brain-space`);
    await expect(page.getByTestId('brain-canvas-toolbar')).toBeVisible();

    const noteCards = page
      .getByTestId('brain-canvas-content')
      .locator(':scope > [data-testid^="brain-note-"]');
    const before = await noteCards.count();
    await page.getByTestId('brain-canvas-tool-question').click();
    await expect(noteCards).toHaveCount(before + 1);
    expect(await readJournal(page)).toEqual([]);

    await page.goto('/#/settings?tab=account');
    await expect(page.getByTestId('cloud-section')).toBeVisible();
    await setUpEncryption(page);

    const frames = await waitForFrames(page);
    expect(frames.some((frame) => frame.entityTable === 'notes')).toBe(true);
    expect(frames.every((frame) => frame.payload.length > 0)).toBe(true);
  });
});
