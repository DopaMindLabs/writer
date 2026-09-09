import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('repairs a corrupt profile row instead of failing on it', async ({
  page,
}) => {
  // Every field invalid: no author id, a name of the wrong type, a hue that is
  // not one of the tokens. The stored row is untrusted input like any other.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lipsum');
        open.onerror = () => reject(new Error('could not open lipsum db'));
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['meta'], 'readwrite');
          tx.objectStore('meta').put({
            key: 'profile',
            value: { authorId: '', displayName: 42, presenceHue: 'not-a-hue' },
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(new Error('could not write the corrupt profile'));
          };
        };
      }),
  );

  // A raw write bypasses Dexie's change notifications, so the live query only
  // sees the corrupt row after a reload.
  await page.goto('/#/settings?tab=profile');
  await page.reload();

  const nameField = page.getByTestId('setting-display-name').locator('input');
  await expect(nameField).toBeVisible();
  // 42 is not a name, so the repaired profile shows an empty one.
  await expect(nameField).toHaveValue('');
  await expect(page.getByTestId('setting-presence-hue')).toBeVisible();

  // The healed row is written back, so the next boot has nothing left to fix.
  const healed = await page.evaluate(
    () =>
      new Promise<{ authorId: string; displayName: unknown; hue: string }>(
        (resolve, reject) => {
          const open = indexedDB.open('lipsum');
          open.onerror = () => reject(new Error('could not open lipsum db'));
          open.onsuccess = () => {
            const db = open.result;
            const req = db
              .transaction(['meta'], 'readonly')
              .objectStore('meta')
              .get('profile');
            req.onsuccess = () => {
              const v = (
                req.result as {
                  value?: {
                    authorId?: string;
                    displayName?: unknown;
                    presenceHue?: string;
                  };
                }
              )?.value;
              db.close();
              resolve({
                authorId: v?.authorId ?? '',
                displayName: v?.displayName,
                hue: v?.presenceHue ?? '',
              });
            };
            req.onerror = () => {
              db.close();
              reject(new Error('could not read the profile back'));
            };
          };
        },
      ),
  );

  expect(healed.authorId).not.toBe('');
  expect(healed.displayName).toBe('');
  expect(healed.hue).toMatch(/^presence-[1-5]$/);
});
