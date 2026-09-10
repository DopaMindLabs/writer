import { test, expect } from './_helpers';
import {
  readDocBody,
  reseedAndGoHome,
  gotoFirstDoc,
  getFirstSpaceIdFromHome,
  openCoveredPage,
} from './_helpers';
import type { Page } from '@playwright/test';

const body = (page: Page) => page.getByTestId('document-body');

/** Count this device's persisted CRDT update rows for a document, read straight
 *  from IndexedDB so the test can observe compaction collapsing the log. */
const countUpdateRows = (page: Page, docId: string): Promise<number> =>
  page.evaluate(
    (id) =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('lipsum');
        open.onerror = () => reject(new Error('could not open lipsum db'));
        open.onsuccess = () => {
          const db = open.result;
          const store = db
            .transaction('docUpdates', 'readonly')
            .objectStore('docUpdates');
          const req = store.index('docId').count(IDBKeyRange.only(id));
          req.onsuccess = () => {
            resolve(req.result);
            db.close();
          };
          req.onerror = () => {
            db.close();
            reject(new Error('could not count docUpdates'));
          };
        };
      }),
    docId,
  );

/** Open the doc inspector's history pane, expanding the inspector if collapsed. */
const openHistory = async (page: Page): Promise<void> => {
  const inspector = page.getByTestId('doc-inspector');
  if (!(await inspector.isVisible())) {
    const iconTab = page.getByTestId('doc-inspector-icons-history');
    if (!(await iconTab.isVisible())) {
      await page.getByRole('button', { name: /doc inspector/i }).click();
    }
    await iconTab.click();
  }
  await expect(inspector).toBeVisible();
  await inspector.getByTestId('doc-inspector-tab-history').click();
  await expect(page.getByTestId('doc-inspector-pane-history')).toBeVisible();
};

/** Open a second tab already pointed at the same document as the first. */
const openSecondTab = async (
  page: Page,
  context: Parameters<typeof openCoveredPage>[0],
  browserName: string,
): Promise<{ pageB: Page; docId: string; spaceId: string }> => {
  const { docId, spaceId } = await gotoFirstDoc(page);
  await expect(body(page)).toBeVisible();
  const pageB = await openCoveredPage(context, browserName);
  await pageB.goto(`/#/s/${spaceId}/d/${docId}`);
  await expect(body(pageB)).toBeVisible();
  return { pageB, docId, spaceId };
};

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('propagates edits between two tabs and converges concurrent edits', async ({
  page,
  context,
  browserName,
}) => {
  const { pageB } = await openSecondTab(page, context, browserName);

  // A → B: the send path on the default page, receive path on the second tab.
  const fromA = `from-A-${Date.now()}`;
  await body(page).click();
  await page.keyboard.type(` ${fromA}`);
  await expect(body(pageB)).toContainText(fromA);

  // B → A: role reversal exercises the receive path on the instrumented default page.
  const fromB = `from-B-${Date.now()}`;
  await body(pageB).click();
  await pageB.keyboard.type(` ${fromB}`);
  await expect(body(page)).toContainText(fromB);

  // Concurrent edits in both tabs converge to a single merged document.
  const both = `both-${Date.now()}`;
  await body(page).click();
  await page.keyboard.type(` A-${both}`);
  await body(pageB).click();
  await pageB.keyboard.type(` B-${both}`);

  await expect(body(page)).toContainText(`A-${both}`);
  await expect(body(page)).toContainText(`B-${both}`);
  await expect(body(pageB)).toContainText(`A-${both}`);
  await expect(body(pageB)).toContainText(`B-${both}`);

  await pageB.close();
});

test('a version restored in one tab propagates to the other', async ({
  page,
  context,
  browserName,
}) => {
  const { pageB } = await openSecondTab(page, context, browserName);

  // Save the current state as a version from the history pane.
  await openHistory(page);
  await page.getByTestId('history-save-version').click();
  await expect(page.getByTestId('save-version-dialog')).toBeVisible();
  await page.getByTestId('save-version-label').fill('checkpoint');
  await page.getByTestId('save-version-submit').click();

  // Type a marker that must disappear on restore, and confirm it reaches B first.
  const marker = `marker-${Date.now()}`;
  await body(page).click();
  await page.keyboard.type(` ${marker}`);
  await expect(body(pageB)).toContainText(marker);

  // Restore the checkpoint through the live editor; both tabs drop the marker.
  await page.getByTestId('open-version-modal').click();
  await expect(page.getByTestId('version-history-modal')).toBeVisible();
  await page.getByTestId('modal-restore').click();
  await expect(page.getByTestId('confirm-dialog')).toBeVisible();
  await page.getByTestId('confirm-dialog-confirm').click();

  await expect(body(page)).not.toContainText(marker);
  await expect(body(pageB)).not.toContainText(marker);

  await pageB.close();
});

test("shows a collaborator's presence cursor in the other tab", async ({
  page,
  context,
  browserName,
}) => {
  // Read the space while on home, then set the display name before opening the
  // document — awareness is published from the profile when the provider connects.
  const spaceId = await getFirstSpaceIdFromHome(page);
  const name = `Ada ${Date.now()}`;
  await page.goto('/#/settings?tab=profile');
  const nameField = page.getByTestId('setting-display-name').getByRole('textbox');
  await nameField.fill(name);
  await nameField.blur();

  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const docId = new URL(page.url()).hash.match(/\/d\/([^/?]+)/)?.[1];
  if (!docId) throw new Error(`Could not extract docId from ${page.url()}`);
  await expect(body(page)).toBeVisible();

  const pageB = await openCoveredPage(context, browserName);
  await pageB.goto(`/#/s/${spaceId}/d/${docId}`);
  await expect(body(pageB)).toBeVisible();

  // Placing a caret in A broadcasts its awareness state; B paints the labelled cursor.
  await body(page).click();
  await page.keyboard.type(' presence');

  await expect(pageB.getByTestId('collab-cursors')).toContainText(name);

  await pageB.close();
});

test('compacts the update log on reconnect without losing content', async ({
  page,
}) => {
  const { docId } = await gotoFirstDoc(page);
  await expect(body(page)).toBeVisible();

  // Each keystroke appends one CRDT row; type enough to pass the compaction
  // threshold (the e2e build lowers it so this stays a short test).
  const marker = `compact-${Date.now()}`;
  await body(page).click();
  await page.keyboard.type(marker);
  await expect(async () => {
    expect(await countUpdateRows(page, docId)).toBeGreaterThan(5);
  }).toPass();

  // Reconnecting (reload) loads the full log and compacts it into one merged row.
  await page.reload();
  await expect(body(page)).toContainText(marker);
  await expect(async () => {
    expect(await countUpdateRows(page, docId)).toBe(1);
  }).toPass();

  // A second reload proves the single merged update reconstructs the document.
  await page.reload();
  await expect(body(page)).toContainText(marker);
});

test('a backup restore from settings reloads the doc in another tab', async ({
  page,
  context,
  browserName,
}) => {
  const { docId, spaceId } = await gotoFirstDoc(page);
  await expect(body(page)).toBeVisible();

  // Snapshot the current (pre-marker) state.
  await page.goto(`/#/s/${spaceId}/settings?tab=backups`);
  await page.getByTestId('space-settings-backups-snapshot').click();
  await expect(page.getByTestId('backups-history')).toBeVisible();

  // Back to the doc; add a marker the restore must remove, and let it persist.
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await expect(body(page)).toBeVisible();
  const rowsBefore = await countUpdateRows(page, docId);
  const marker = `stale-${Date.now()}`;
  await body(page).click();
  await page.keyboard.type(` ${marker}`);
  await expect(body(page)).toContainText(marker);
  // Tab B reads the shared CRDT log and the restore diffs the saved body, so
  // both must have durably taken the marker first — observed, not slept for.
  await expect.poll(() => readDocBody(page, docId), { timeout: 15_000 }).toContain(marker);
  await expect
    .poll(() => countUpdateRows(page, docId), { timeout: 15_000 })
    .toBeGreaterThan(rowsBefore);

  // Tab B opens the same doc and sees the marker via the shared CRDT log.
  const pageB = await openCoveredPage(context, browserName);
  await pageB.goto(`/#/s/${spaceId}/d/${docId}`);
  await expect(body(pageB)).toContainText(marker);

  // Restore the snapshot from Tab A's settings surface — no editor mounted here.
  await page.goto(`/#/s/${spaceId}/settings?tab=backups`);
  await page
    .getByTestId('backups-history')
    .locator('[data-testid$="-restore"]')
    .first()
    .click();
  await page.getByTestId('restore-backup-dialog-confirm').click();
  await expect(page.getByText(/snapshot restored/i)).toBeVisible();

  // Tab B must reload the fresh seed and drop the stale marker rather than
  // clobbering the restored body from its now-stale Y.Doc.
  await expect(body(pageB)).not.toContainText(marker);

  await pageB.close();
});
