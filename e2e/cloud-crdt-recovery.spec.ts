import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

/**
 * Regression for the cloud sign-out data-loss crash: signing out clears the
 * local-only CRDT log (`docUpdates`) and seed markers (`meta`) while the synced
 * `docs` rows re-pull with their bodies intact. Reopening a doc must heal its
 * CRDT from the body rather than mount a blank editor (which also crashed the
 * reconciler with Lexical error #38). This drives that wipe directly against
 * IndexedDB — no cloud account needed — and asserts recovery.
 */
test('recovers a doc after its local CRDT log is wiped (sign-out simulation)', async ({
  page,
}) => {
  const lexicalErrors: string[] = [];
  page.on('pageerror', (error) => {
    if (/error\s*#?38|editor state is empty/i.test(error.message)) {
      lexicalErrors.push(error.message);
    }
  });

  await reseedAndGoHome(page);
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const docUrl = page.url();

  const editor = page.locator('[aria-label="Document body"]');
  await expect(editor).toBeVisible();

  const probe = `crdt-recovery-probe-${String(Date.now())}`;
  await editor.click();
  await page.keyboard.type(probe);
  await expect(editor).toContainText(probe);
  // Let the autosave debounce flush the body into the docs row.
  await page.waitForTimeout(1000);

  // Simulate the cloud addon's logout: clear the local-only tables while the
  // docs row (with its body) survives, exactly as a sign-out then re-pull leaves
  // the database.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('lipsum');
        request.onsuccess = () => {
          const idb = request.result;
          const tx = idb.transaction(['docUpdates', 'meta'], 'readwrite');
          tx.objectStore('docUpdates').clear();
          tx.objectStore('meta').clear();
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );

  await page.goto(docUrl);

  // The doc heals from its body: the content renders and remains editable.
  const healed = page.locator('[aria-label="Document body"]');
  await expect(healed).toContainText(probe);
  await healed.click();
  await page.keyboard.type(' and more');
  await expect(healed).toContainText(`${probe} and more`);

  expect(
    lexicalErrors,
    `Lexical #38 errors after recovery:\n${lexicalErrors.join('\n')}`,
  ).toEqual([]);
});
