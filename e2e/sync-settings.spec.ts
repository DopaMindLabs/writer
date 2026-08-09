import { test, expect } from './_helpers';
import { getFirstSpaceIdFromHome, reseedAndGoHome } from './_helpers';

const stubDirectoryPicker = async (page: Parameters<typeof reseedAndGoHome>[0]) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      writable: true,
      value: () => Promise.resolve({ name: 'Sync Folder', kind: 'directory' }),
    });
  });
};

test.describe('Folder sync against a real directory', () => {
  test.beforeEach(async ({ page }) => {
    // The origin-private file system hands out real FileSystemDirectoryHandles
    // headlessly, so the whole write path runs: archives, history files and
    // pruning — not a stub that fails at the first write.
    await page.addInitScript(() => {
      Object.defineProperty(window, 'showDirectoryPicker', {
        configurable: true,
        writable: true,
        // A named subdirectory: the OPFS root's name is the empty string,
        // which the settings surface reads as "no folder chosen".
        value: async () => {
          const root = await navigator.storage.getDirectory();
          return root.getDirectoryHandle('SyncFolder', { create: true });
        },
      });
    });
    await reseedAndGoHome(page);
  });

  test('archives land in the folder, and a due space syncs itself at boot', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const spaceId = await getFirstSpaceIdFromHome(page);
    await page.goto('/#/settings?tab=sync');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /choose folder/i }).click();
    await page.getByRole('button', { name: /sync all spaces/i }).click();
    await expect(page.getByTestId('sync-results')).toBeVisible();
    await expect(page.getByTestId('sync-results')).not.toContainText(/error/i);
    await expect(page.getByTestId('sync-history')).toBeVisible();

    // The archive is really in the directory: a latest.zip under the space's
    // folder, beside one timestamped history file.
    const written = await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const folder = await root.getDirectoryHandle('SyncFolder');
      const names: string[] = [];
      for await (const [dirName, entry] of folder as unknown as AsyncIterable<
        [string, FileSystemHandle]
      >) {
        if (entry.kind !== 'directory') continue;
        for await (const [fileName] of entry as unknown as AsyncIterable<
          [string, FileSystemHandle]
        >) {
          names.push(`${dirName}/${fileName}`);
        }
      }
      return names;
    });
    expect(written.some((name) => name.endsWith('/latest.zip'))).toBe(true);
    expect(written.some((name) => /\/\d{4}-\d{2}-\d{2}-\d{6}\.zip$/.test(name))).toBe(
      true,
    );

    // A per-space interval of its own, then make the last sync look old enough
    // that the boot scheduler owes this space a fresh archive.
    await page.goto(`/#/s/${spaceId}/settings?tab=sync`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /^5 min$/ }).click();
    const lastSyncedBefore = await page.evaluate(
      () =>
        new Promise<number>((resolve, reject) => {
          const open = indexedDB.open('lipsum');
          open.onerror = () => reject(new Error('could not open lipsum db'));
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction('syncs', 'readwrite');
            const store = tx.objectStore('syncs');
            const all = store.getAll();
            all.onsuccess = () => {
              let newest = 0;
              for (const row of all.result as { when: number }[]) {
                newest = Math.max(newest, row.when);
                store.put({ ...row, when: row.when - 60 * 60_000 });
              }
              tx.oncomplete = () => {
                db.close();
                resolve(newest - 60 * 60_000);
              };
            };
          };
        }),
    );

    // The scheduler's first pass is a full minute out; move the clock there
    // instead of waiting for it.
    await page.clock.install();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.clock.fastForward(61_000);
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              new Promise<number>((resolve, reject) => {
                const open = indexedDB.open('lipsum');
                open.onerror = () => reject(new Error('could not open lipsum db'));
                open.onsuccess = () => {
                  const db = open.result;
                  const all = db
                    .transaction('syncs', 'readonly')
                    .objectStore('syncs')
                    .getAll();
                  all.onsuccess = () => {
                    let newest = 0;
                    for (const row of all.result as { when: number }[]) {
                      newest = Math.max(newest, row.when);
                    }
                    db.close();
                    resolve(newest);
                  };
                };
              }),
          ),
        { timeout: 15_000 },
      )
      .toBeGreaterThan(lastSyncedBefore);
  });
});

test.describe('Folder sync settings', () => {
  test.beforeEach(async ({ page }) => {
    await stubDirectoryPicker(page);
    await reseedAndGoHome(page);
  });

  test('global Sync tab: connect, change interval, run sync, disconnect', async ({
    page,
  }) => {
    await page.goto('/#/settings?tab=sync');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /choose folder/i }).click();
    await expect(page.getByText('Sync Folder')).toBeVisible();

    await page.getByRole('button', { name: /^30 min$/ }).click();

    await page.getByRole('button', { name: /sync all spaces/i }).click();
    await expect(page.getByTestId('sync-results')).toBeVisible();
    await expect(page.getByTestId('sync-history')).toBeVisible();

    await page.getByRole('button', { name: /^disconnect$/i }).click();
    await expect(
      page.getByRole('button', { name: /choose folder/i }),
    ).toBeVisible();
  });

  test('space Sync tab: a failed manual sync surfaces an error', async ({
    page,
  }) => {
    const spaceId = await getFirstSpaceIdFromHome(page);
    await page.goto(`/#/s/${spaceId}/settings?tab=sync`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /choose folder/i }).click();
    await expect(page.getByText('Sync Folder')).toBeVisible();

    await page.getByRole('button', { name: /sync this space/i }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
