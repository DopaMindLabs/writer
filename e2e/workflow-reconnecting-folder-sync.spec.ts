import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

test.describe('Workflow: reconnecting a lapsed sync folder', () => {
  test.beforeEach(async ({ page }) => {
    // A real OPFS handle, wrapped so its permission starts out lapsed and is
    // granted only when asked interactively — the state the browser leaves a
    // stored handle in at the start of a new session.
    // Permission lives on the handle's prototype, not the object the picker
    // returns: the chosen handle is persisted to IndexedDB, and the structured
    // clone that comes back drops anything added to the instance.
    await page.addInitScript(() => {
      let granted = false;
      const proto = FileSystemDirectoryHandle.prototype as unknown as Record<
        string,
        unknown
      >;
      proto.queryPermission = () =>
        Promise.resolve(granted ? 'granted' : 'prompt');
      proto.requestPermission = () => {
        granted = true;
        return Promise.resolve('granted');
      };
      Object.defineProperty(window, 'showDirectoryPicker', {
        configurable: true,
        writable: true,
        value: async () => {
          const root = await navigator.storage.getDirectory();
          return root.getDirectoryHandle('LapsedFolder', { create: true });
        },
      });
    });
    await reseedAndGoHome(page);
  });

  test('choose a folder whose permission has lapsed, then reconnect it', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await test.step('Given the writer opens folder sync and chooses a folder', async () => {
      await page.goto('/#/settings?tab=sync');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /choose folder/i }).click();
    });

    await test.step('Then they are told sync is paused until permission returns', async () => {
      await expect(page.getByText(/Sync is paused/i)).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Reconnect' }),
      ).toBeVisible();
    });

    await test.step('When they reconnect', async () => {
      await page.getByRole('button', { name: 'Reconnect' }).click();
    });

    await test.step('Then the notice clears and syncing is available again', async () => {
      await expect(page.getByText(/Sync is paused/i)).toBeHidden();
      await page.getByRole('button', { name: /sync all spaces/i }).click();
      await expect(page.getByTestId('sync-results')).toBeVisible();
      await expect(page.getByTestId('sync-results')).not.toContainText(/error/i);
    });
  });
});
