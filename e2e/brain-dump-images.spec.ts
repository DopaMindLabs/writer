import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

// A 1×1 transparent PNG, supplied as an in-memory payload so no fixture file is
// needed on disk.
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

const addQuestionNote = async (page: Page) => {
  const canvas = page.getByTestId('brain-canvas');
  await expect(canvas).toBeVisible();
  const noteCards = page.getByTestId('brain-canvas-content').locator(':scope > [data-testid^="brain-note-"]');
  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(noteCards).toHaveCount(1);
  return noteCards.last();
};

const openDrawer = async (page: Page) => {
  const note = await addQuestionNote(page);
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();
  const drawer = page.getByTestId('brain-detail-drawer');
  await expect(drawer).toBeVisible();
  return drawer;
};

test('uploads a picture via the drawer, persists across reload, and removes it', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/dump`);

  const drawer = await openDrawer(page);
  await drawer
    .getByTestId('brain-detail-drawer-attachments-input')
    .setInputFiles(pngPayload('ref.png'));

  await expect(
    drawer.getByTestId('brain-detail-drawer-attachments-count'),
  ).toHaveText('1 / 2');
  await expect(drawer.getByRole('img', { name: 'ref.png' })).toBeVisible();

  // Close the drawer and hard-reload: the attachment lives in IndexedDB.
  await page.getByTestId('brain-detail-drawer-close').click();
  await page.reload();

  const card = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]')
    .last();
  await expect(card.locator('[data-testid$="-images"]')).toBeVisible();
  await expect(card.getByRole('img', { name: 'ref.png' })).toBeVisible();

  // Reopen the drawer and remove the picture.
  await card.hover();
  await card.locator('[data-testid$="-open-details"]').click();
  const reopened = page.getByTestId('brain-detail-drawer');
  const remove = reopened.locator(
    '[data-testid^="brain-detail-drawer-attachments-image-"][data-testid$="-remove"]',
  );
  await remove.first().click();
  await expect(
    reopened.getByTestId('brain-detail-drawer-attachments-count'),
  ).toHaveText('0 / 2');
});

test('enforces the two-image limit per note', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/dump`);

  const drawer = await openDrawer(page);
  await drawer
    .getByTestId('brain-detail-drawer-attachments-input')
    .setInputFiles([pngPayload('a.png'), pngPayload('b.png')]);

  await expect(
    drawer.getByTestId('brain-detail-drawer-attachments-count'),
  ).toHaveText('2 / 2');
  await expect(
    drawer.getByTestId('brain-detail-drawer-attachments-upload'),
  ).toBeDisabled();
  await expect(
    drawer.getByTestId('brain-detail-drawer-attachments-limit-hint'),
  ).toBeVisible();

  // The card's quick-add button disappears once the limit is reached.
  await page.getByTestId('brain-detail-drawer-close').click();
  const card = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]')
    .last();
  await card.hover();
  await expect(card.locator('[data-testid$="-add-image"]')).toHaveCount(0);
});
