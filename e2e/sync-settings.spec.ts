import { test, expect } from './_helpers';
import type { Page } from '@playwright/test';
import { getFirstSpaceIdFromHome, reseedAndGoHome } from './_helpers';

// Headless Chromium has the File System Access API surface but no real
// directory picker, so the connected folder-sync UI is otherwise unreachable in
// e2e. We stub `showDirectoryPicker` to return a *method-free* handle: it is
// structured-cloneable into IndexedDB (db.meta) so `folderName` populates and
// the connected UI renders, while the missing `getDirectoryHandle`/permission
// methods make writes fail — which is exactly what exercises the error
// StatusGlyph, the failed StatusBadge rows, and the results table.
const stubDirectoryPicker = async (page: Page) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      writable: true,
      value: () => Promise.resolve({ name: 'Sync Folder', kind: 'directory' }),
    });
  });
};

// Seed an `ok` sync entry straight into IndexedDB so the history table renders a
// success StatusBadge (a real successful write is impossible with the
// method-free handle). The subsequent failed sync run adds error rows via Dexie,
// whose liveQuery re-read then surfaces both the seeded ok row and the errors.
const seedOkSyncEntry = async (page: Page, spaceId: string) => {
  await page.evaluate(async (sid) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('lipsum');
      req.onsuccess = () => {
        const idb = req.result;
        const tx = idb.transaction('syncs', 'readwrite');
        tx.objectStore('syncs').put({
          id: `seed-ok-${sid}`,
          spaceId: sid,
          when: Date.now(),
          kind: 'manual',
          status: 'ok',
          size: 4096,
          filename: 'latest.zip',
        });
        tx.oncomplete = () => {
          idb.close();
          resolve();
        };
        tx.onerror = () => {
          reject(tx.error ?? new Error('seed failed'));
        };
      };
      req.onerror = () => {
        reject(req.error ?? new Error('open failed'));
      };
    });
  }, spaceId);
};

test.describe('Folder sync settings', () => {
  test.beforeEach(async ({ page }) => {
    await stubDirectoryPicker(page);
    await reseedAndGoHome(page);
  });

  test('global Sync tab: connect, change interval, run sync, disconnect', async ({
    page,
  }) => {
    const spaceId = await getFirstSpaceIdFromHome(page);
    // Seed a successful run so the history renders a success StatusBadge.
    await seedOkSyncEntry(page, spaceId);

    await page.goto('/#/settings?tab=sync');
    await page.waitForLoadState('networkidle');

    // Connect the mocked folder; the connected UI (interval chips, sync button)
    // appears once folderName is set.
    await page.getByRole('button', { name: /choose folder/i }).click();
    await expect(page.getByText('Sync Folder')).toBeVisible();

    // ChipGroup value-mode: pick a non-default interval.
    await page.getByRole('button', { name: /^30 min$/ }).click();

    // The method-free handle makes every per-space write fail, so the run
    // produces a results table and error history rows (failed StatusBadge),
    // alongside the seeded success row.
    await page.getByRole('button', { name: /sync all spaces/i }).click();
    await expect(page.getByTestId('sync-results')).toBeVisible();
    await expect(page.getByTestId('sync-history')).toBeVisible();

    // Disconnect returns the row to its "choose folder" state.
    await page.getByRole('button', { name: /^disconnect$/i }).click();
    await expect(
      page.getByRole('button', { name: /choose folder/i }),
    ).toBeVisible();
  });

  test('space Sync tab: inherit interval + a failed manual sync error', async ({
    page,
  }) => {
    const spaceId = await getFirstSpaceIdFromHome(page);
    await page.goto(`/#/s/${spaceId}/settings?tab=sync`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /choose folder/i }).click();
    await expect(page.getByText('Sync Folder')).toBeVisible();

    // The per-space picker offers an extra "Default (…)" chip mapped to the
    // inherit sentinel; exercise both it and a concrete interval.
    await page.getByRole('button', { name: /^default \(/i }).click();
    await page.getByRole('button', { name: /^5 min$/ }).click();

    await page.getByRole('button', { name: /sync this space/i }).click();
    // syncOneSpace fails on the method-free handle -> StatusGlyph alert line.
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('Sync tab shows the unsupported notice when the API is absent', async ({
    page,
  }) => {
    // `showDirectoryPicker` is a Window.prototype method, so the feature only
    // reads as unsupported once it is removed from both the instance (the
    // beforeEach stub) and the prototype.
    await page.addInitScript(() => {
      const proto = Object.getPrototypeOf(window) as object;
      try {
        delete (window as unknown as Record<string, unknown>)
          .showDirectoryPicker;
      } catch {
        /* not configurable — ignore */
      }
      try {
        delete (proto as Record<string, unknown>).showDirectoryPicker;
      } catch {
        /* not configurable — ignore */
      }
    });
    await page.goto('/#/settings?tab=sync');
    await expect(page.getByText(/File System Access API/i)).toBeVisible();
  });
});
