import type { Page } from '@playwright/test';
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
  await page.goto(`/#/s/${spaceId}/brain-space`);

  const drawer = await openDrawer(page);
  await drawer
    .getByTestId('brain-detail-drawer-attachments-input')
    .setInputFiles(pngPayload('ref.png'));

  await expect(
    drawer.getByTestId('brain-detail-drawer-attachments-count'),
  ).toHaveText('1 / 2');
  await expect(drawer.getByRole('img', { name: 'ref.png' })).toBeVisible();

  await page.getByTestId('brain-detail-drawer-close').click();
  await page.reload();

  const card = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]')
    .last();
  await expect(card.locator('[data-testid$="-images"]')).toBeVisible();
  await expect(card.getByRole('img', { name: 'ref.png' })).toBeVisible();

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
  await page.goto(`/#/s/${spaceId}/brain-space`);

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

  await page.getByTestId('brain-detail-drawer-close').click();
  const card = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]')
    .last();
  await card.hover();
  await expect(card.locator('[data-testid$="-add-image"]')).toHaveCount(0);
});

test('rejects a picture over the size limit and reports why', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);

  const drawer = await openDrawer(page);
  await drawer.getByTestId('brain-detail-drawer-attachments-input').setInputFiles({
    name: 'huge.png',
    mimeType: 'image/png',
    // One byte past the 5 MB ceiling.
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });

  await expect(
    drawer.getByTestId('brain-detail-drawer-attachments-reject-banner'),
  ).toContainText(/larger than 5 MB/i);
  await expect(
    drawer.getByTestId('brain-detail-drawer-attachments-count'),
  ).toHaveText('0 / 2');
});

test('rejects an unsupported file type and reports why', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);

  const drawer = await openDrawer(page);
  await drawer.getByTestId('brain-detail-drawer-attachments-input').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  });

  await expect(
    drawer.getByTestId('brain-detail-drawer-attachments-reject-banner'),
  ).toContainText(/unsupported type/i);
  await expect(
    drawer.getByTestId('brain-detail-drawer-attachments-count'),
  ).toHaveText('0 / 2');
});

test('takes what fits and names the pictures beyond the limit', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);

  const drawer = await openDrawer(page);
  // Three at once against a ceiling of two: the first two land, the third is
  // reported rather than silently dropped.
  await drawer
    .getByTestId('brain-detail-drawer-attachments-input')
    .setInputFiles([pngPayload('a.png'), pngPayload('b.png'), pngPayload('c.png')]);

  await expect(
    drawer.getByTestId('brain-detail-drawer-attachments-count'),
  ).toHaveText('2 / 2');
  await expect(
    drawer.getByTestId('brain-detail-drawer-attachments-reject-banner'),
  ).toContainText(/c\.png/);
});
