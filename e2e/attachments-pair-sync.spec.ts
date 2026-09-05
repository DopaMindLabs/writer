import type { Page } from '@playwright/test';
import { pair } from './_pairing';
import {
  expect,
  getFirstSpaceIdFromHome,
  openCoveredContext,
  reseedAndGoHome,
  test,
} from './_helpers';

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/1eHAAAAAElFTkSuQmCC';
const IMAGE_BYTES = 300 * 1024;
const SYNC_TIMEOUT = 30_000;

/** A valid image padded beyond two transfer chunks. PNG readers ignore trailing bytes. */
const pngPayload = (name: string) => {
  const image = Buffer.from(PNG_1PX, 'base64');
  return {
    name,
    mimeType: 'image/png',
    buffer: Buffer.concat([image, Buffer.alloc(IMAGE_BYTES - image.length)]),
  };
};

const addQuestionNote = async (page: Page) => {
  const canvas = page.getByTestId('brain-canvas');
  await expect(canvas).toBeVisible();
  const notes = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]');
  const before = await notes.count();
  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(notes).toHaveCount(before + 1);
  return notes.last();
};

const attachImage = async (page: Page, name: string): Promise<void> => {
  const note = await addQuestionNote(page);
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();
  const drawer = page.getByTestId('brain-detail-drawer');
  await expect(drawer).toBeVisible();
  await drawer
    .getByTestId('brain-detail-drawer-attachments-input')
    .setInputFiles(pngPayload(name));
  await expect(drawer.getByRole('img', { name })).toBeVisible();
};

/**
 * Leave a partial attachment in the scope, as an interrupted transfer would:
 * a domain row whose chunk set has a hole where chunk 0 should be. Building a
 * manifest over it fails, and offers used to manifest the whole scope — so one
 * such attachment silently blocked every image that followed it.
 */
const poisonScopeAttachment = (page: Page, spaceId: string): Promise<void> =>
  page.evaluate(
    (scope) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lipsum');
        open.onerror = () => reject(new Error('could not open lipsum db'));
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(
            ['noteAttachments', 'syncAttachmentChunks'],
            'readwrite',
          );
          tx.objectStore('noteAttachments').put({
            id: 'poisoned-e2e',
            noteId: 'missing-note-e2e',
            spaceId: scope,
            accessScopeId: scope,
            createdBy: 'me',
            updatedBy: 'me',
            mutationId: 'op-poisoned-e2e',
            logicalUpdatedAt: { millis: 1, counter: 0 },
            name: 'poisoned.png',
            mime: 'image/png',
            size: 2,
            blob: new Blob([new Uint8Array(2)], { type: 'image/png' }),
            createdAt: 1,
          });
          tx.objectStore('syncAttachmentChunks').put({
            attachmentId: 'poisoned-e2e',
            index: 1,
            accessScopeId: scope,
            bytes: 'AQ==',
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(new Error('could not write the partial attachment'));
          };
        };
      }),
    spaceId,
  );

test('images keep crossing a live link past a partial attachment, one after another', async ({
  page,
  browser,
  browserName,
}) => {
  test.setTimeout(120_000);
  const peer = await openCoveredContext(browser, browserName);
  await reseedAndGoHome(page);
  const spaceId = await getFirstSpaceIdFromHome(page);
  await peer.goto('/#/');

  await pair(page, peer);
  await expect(peer.locator('[data-testid^="space-rail-space-"]').first()).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });
  await page.keyboard.press('Escape');
  await peer.keyboard.press('Escape');

  // The scope already holds a partial attachment before any image is added.
  await poisonScopeAttachment(page, spaceId);

  await page.goto(`/#/s/${spaceId}/brain-space`);
  await peer.goto(`/#/s/${spaceId}/brain-space`);

  // First image: one bad attachment in the scope must not block its offer.
  await attachImage(page, 'first.png');
  await expect(peer.getByRole('img', { name: 'first.png' })).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('brain-detail-drawer')).toBeHidden();

  // Second image, same direction: the offer cursor must continue, not restart.
  await attachImage(page, 'second.png');
  await expect(peer.getByRole('img', { name: 'second.png' })).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });
});

test('an image crosses a paired connection and survives reload', async ({
  page,
  browser,
  browserName,
}) => {
  test.setTimeout(120_000);
  const peer = await openCoveredContext(browser, browserName);
  await reseedAndGoHome(page);
  const spaceId = await getFirstSpaceIdFromHome(page);
  await peer.goto('/#/');

  await pair(page, peer);
  await expect(peer.locator('[data-testid^="space-rail-space-"]').first()).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });
  await page.keyboard.press('Escape');
  await peer.keyboard.press('Escape');

  await page.goto(`/#/s/${spaceId}/brain-space`);
  await peer.goto(`/#/s/${spaceId}/brain-space`);
  await attachImage(page, 'paired.png');

  await expect(peer.getByRole('img', { name: 'paired.png' })).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });
  await peer.reload();
  await expect(peer.getByRole('img', { name: 'paired.png' })).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });
});
