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
