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

const noteCards = (page: Page) =>
  page.getByTestId('brain-canvas-content').locator(':scope > [data-testid^="brain-note-"]');

const createTwoLinkedNotes = async (page: Page) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();

  await page.getByTestId('brain-canvas-tool-question').click();
  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(noteCards(page)).toHaveCount(2);

  // Shift-pick to create a connection between the two notes
  await noteCards(page).first().dispatchEvent('pointerdown', { shiftKey: true, button: 0 });
  await noteCards(page).last().dispatchEvent('pointerdown', { shiftKey: true, button: 0 });

  return spaceId;
};

test('drawer shows connections and allows navigating to a connected note', async ({
  page,
}) => {
  await createTwoLinkedNotes(page);

  const note = noteCards(page).last();
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();

  const drawer = page.getByTestId('brain-detail-drawer');
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByTestId('brain-detail-drawer-connections-empty'),
  ).toHaveCount(0);

  // There should be at least one connection row
  const connectionRow = drawer.locator('[data-testid^="brain-detail-drawer-connection-"]').first();
  await expect(connectionRow).toBeVisible();

  // Click the focus button on the connection — this focuses the linked note
  await connectionRow.locator('[data-testid$="-focus"]').click();
  // The drawer closes after focusing another note
  await page.getByTestId('brain-detail-drawer-close').click();
  await expect(drawer).toHaveCount(0);
});

test('drawer allows removing a connection', async ({ page }) => {
  await createTwoLinkedNotes(page);

  const note = noteCards(page).last();
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();

  const drawer = page.getByTestId('brain-detail-drawer');
  await expect(drawer).toBeVisible();

  const connectionRow = drawer.locator('[data-testid^="brain-detail-drawer-connection-"]').first();
  await expect(connectionRow).toBeVisible();

  await connectionRow.locator('[data-testid$="-remove"]').click();
  await expect(
    drawer.getByTestId('brain-detail-drawer-connections-empty'),
  ).toBeVisible();
});

test('drawer lightbox opens when clicking an uploaded attachment image', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();

  await page.getByTestId('brain-canvas-tool-question').click();
  const note = noteCards(page).last();
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();

  const drawer = page.getByTestId('brain-detail-drawer');
  await drawer
    .getByTestId('brain-detail-drawer-attachments-input')
    .setInputFiles(pngPayload('view-me.png'));

  await expect(drawer.getByRole('img', { name: 'view-me.png' })).toBeVisible();

  // Open the image in the lightbox
  await drawer
    .locator('[data-testid^="brain-detail-drawer-attachments-image-"][data-testid$="-open"]')
    .first()
    .click();

  const lightbox = page.getByTestId('image-lightbox');
  await expect(lightbox).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(lightbox).toBeHidden();
});

test('drawer delete button removes the note', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();

  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(noteCards(page)).toHaveCount(1);

  const note = noteCards(page).last();
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();

  const drawer = page.getByTestId('brain-detail-drawer');
  await expect(drawer).toBeVisible();
  await page.getByTestId('brain-detail-drawer-delete').click();

  await expect(noteCards(page)).toHaveCount(0);
  await expect(drawer).toHaveCount(0);
});
