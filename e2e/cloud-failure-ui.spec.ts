import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';
import type { Page } from '@playwright/test';

/**
 * Covers the failure-only surfaces that a headless run cannot provoke a real
 * failure for: the CRDT mount-error banner (editor gate held closed) and the
 * cloud key-error recovery screen with a failed, retryable device reset. The
 * `build:e2e` build arms build-time fault switches (`VITE_E2E_*`) that trip only
 * for the specific doc ids these specs seed, so the rest of the suite is
 * unaffected.
 */

const EMPTY_BODY =
  '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

/** Seed a doc row at a known id (plain e2e DB, unencrypted) so a fault can target it. */
const seedFaultDoc = (page: Page, spaceId: string, docId: string): Promise<void> =>
  page.evaluate(
    ({ spaceId, docId, body }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('lipsum');
        request.onsuccess = () => {
          const idb = request.result;
          const tx = idb.transaction(['sections', 'docs'], 'readwrite');
          const sections = tx.objectStore('sections').getAll();
          sections.onsuccess = () => {
            const section = (sections.result as { id: string; spaceId: string }[]).find(
              (s) => s.spaceId === spaceId,
            );
            tx.objectStore('docs').put({
              id: docId,
              spaceId,
              sectionId: section?.id ?? 'sec',
              name: 'E2E fault doc',
              body,
              meta: { wordCount: 0 },
              updatedAt: Date.now(),
            });
          };
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
    { spaceId, docId, body: EMPTY_BODY },
  );

test('holds the editor closed with a retryable banner when CRDT reconciliation fails', async ({
  page,
}) => {
  await reseedAndGoHome(page);
  const spaceId = await getFirstSpaceIdFromHome(page);
  await seedFaultDoc(page, spaceId, 'e2e-crdt-fail');

  await page.goto(`/#/s/${spaceId}/d/e2e-crdt-fail`);

  const banner = page.getByTestId('crdt-mount-error');
  await expect(banner).toBeVisible();
  // The editor never mounts over the unverified state.
  await expect(page.locator('[aria-label="Document body"]')).toHaveCount(0);

  // Retry is operable (re-runs the gate; the forced fault keeps it closed).
  await banner.getByRole('button', { name: /try again/i }).click();
  await expect(page.getByTestId('crdt-mount-error')).toBeVisible();
});

test('shows the cloud key-error screen and a retryable device-reset failure', async ({
  page,
}) => {
  await reseedAndGoHome(page);
  const spaceId = await getFirstSpaceIdFromHome(page);
  await seedFaultDoc(page, spaceId, 'e2e-key-error');

  await page.goto(`/#/s/${spaceId}/d/e2e-key-error`);

  await expect(
    page.getByRole('button', { name: /unlock in settings/i }),
  ).toBeVisible();

  // Reset is forced to fail, surfacing a retryable alert rather than reloading.
  await page.getByRole('button', { name: /reset this device instead/i }).click();
  await page.getByTestId('confirm-dialog-confirm').click();

  await expect(page.getByRole('alert')).toContainText(/couldn't reset this device/i);
  await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
});
