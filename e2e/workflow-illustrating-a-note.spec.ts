import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/1eHAAAAAElFTkSuQmCC';

const pngPayload = (name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(PNG_1PX, 'base64'),
});

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test.describe('Workflow: illustrating a note', () => {
  test('link two notes, illustrate one, be told what is refused, then delete it', async ({
    page,
  }) => {
    const spaceId = await getFirstSpaceIdFromHome(page);
    const noteCards = page
      .getByTestId('brain-canvas-content')
      .locator(':scope > [data-testid^="brain-note-"]');
    const drawer = page.getByTestId('brain-detail-drawer');
    const input = drawer.getByTestId('brain-detail-drawer-attachments-input');
    const count = drawer.getByTestId('brain-detail-drawer-attachments-count');
    const rejected = drawer.getByTestId(
      'brain-detail-drawer-attachments-reject-banner',
    );

    await test.step('Given the writer has two notes on the canvas', async () => {
      await page.goto(`/#/s/${spaceId}/brain-space`);
      await expect(page.getByTestId('brain-canvas')).toBeVisible();
      await page.getByTestId('brain-canvas-tool-question').click();
      await expect(noteCards).toHaveCount(1);
      await page.getByTestId('brain-canvas-tool-question').click();
      await expect(noteCards).toHaveCount(2);
    });

    await test.step('And they shift-click each one to link them', async () => {
      // New cards are staggered by 24px, so the newest sits on top and the one
      // beneath keeps an exposed strip along its top and left edge. Both are
      // clicked for real: a dispatched event would skip hit-testing and let
      // this pass even when a card is unreachable.
      await noteCards.last().click({ modifiers: ['Shift'] });
      // Near the foot of that strip: the card's own "+ title" button sits at
      // its top-left and appears on hover, so it would take a click aimed
      // there. The point is measured rather than guessed, so it stays inside
      // the card whatever its height.
      const under = noteCards.first();
      const box = await under.boundingBox();
      expect(box).not.toBeNull();
      await under.click({
        modifiers: ['Shift'],
        position: { x: 10, y: Number(box?.height) - 8 },
      });
    });

    await test.step('When they open the second note to illustrate it', async () => {
      const note = noteCards.last();
      await note.hover();
      await note.locator('[data-testid$="-open-details"]').click();
      await expect(drawer).toBeVisible();
      await expect(
        drawer.getByTestId('brain-detail-drawer-connections-empty'),
      ).toHaveCount(0);
    });

    await test.step('Then a picture too large to store is refused, and said so', async () => {
      await input.setInputFiles({
        name: 'huge.png',
        mimeType: 'image/png',
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
      });
      await expect(rejected).toContainText(/larger than 5 MB/i);
      await expect(count).toHaveText('0 / 2');
    });

    await test.step('And a file that is not a picture is refused too', async () => {
      await input.setInputFiles({
        name: 'notes.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('not an image'),
      });
      await expect(rejected).toContainText(/unsupported type/i);
      await expect(count).toHaveText('0 / 2');
    });

    await test.step('And picking three at once keeps two and names the third', async () => {
      await input.setInputFiles([
        pngPayload('a.png'),
        pngPayload('b.png'),
        pngPayload('c.png'),
      ]);
      await expect(count).toHaveText('2 / 2');
      await expect(rejected).toContainText(/c\.png/);
      await expect(
        drawer.getByTestId('brain-detail-drawer-attachments-limit-hint'),
      ).toBeVisible();
    });

    await test.step('And deleting the note takes its pictures and its link with it', async () => {
      await drawer.getByTestId('brain-detail-drawer-delete').click();
      await expect(drawer).toBeHidden();
      await expect(noteCards).toHaveCount(1);

      const left = await page.evaluate(
        () =>
          new Promise<{ connections: number; attachments: number; notes: number }>(
            (resolve, reject) => {
              const open = indexedDB.open('lipsum');
              open.onerror = () => reject(new Error('could not open lipsum db'));
              open.onsuccess = () => {
                const db = open.result;
                const tx = db.transaction(
                  ['connections', 'noteAttachments', 'notes'],
                  'readonly',
                );
                const c = tx.objectStore('connections').count();
                const a = tx.objectStore('noteAttachments').count();
                const n = tx.objectStore('notes').count();
                tx.oncomplete = () => {
                  db.close();
                  resolve({
                    connections: c.result,
                    attachments: a.result,
                    notes: n.result,
                  });
                };
                tx.onerror = () => {
                  db.close();
                  reject(new Error('could not count the cascade tables'));
                };
              };
            },
          ),
      );
      expect(left).toEqual({ connections: 0, attachments: 0, notes: 1 });
    });
  });
});
