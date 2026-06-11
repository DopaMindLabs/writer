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

const gotoDump = async (page: Page) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/dump`);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();
};

const lastCard = (page: Page) =>
  page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]')
    .last();

test('creates an image card, uploads through its drop zone, and views it full size', async ({
  page,
}) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-image').click();
  const card = lastCard(page);
  const dropzone = card.locator('[data-testid$="-image-dropzone"]');
  await expect(dropzone).toBeVisible();
  await expect(dropzone).toContainText(/add a picture/i);

  await card
    .locator('[data-testid$="-image-dropzone-input"]')
    .setInputFiles(pngPayload('shot.png'));

  const primary = card.locator('[data-testid$="-image-primary"]');
  await expect(primary).toBeVisible();
  await expect(card.locator('[data-testid$="-image-dropzone"]')).toHaveCount(0);

  await primary.click();
  const lightbox = page.getByTestId('image-lightbox');
  await expect(lightbox).toBeVisible();
  await expect(page.getByTestId('image-lightbox-image')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(lightbox).toBeHidden();
});

test('image cards have no body editor and survive a reload', async ({ page }) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-image').click();
  let card = lastCard(page);
  await card
    .locator('[data-testid$="-image-dropzone-input"]')
    .setInputFiles(pngPayload('keep.png'));
  await expect(card.locator('[data-testid$="-image-primary"]')).toBeVisible();

  await expect(card.locator('[data-testid$="-body"]')).toHaveCount(0);

  await page.reload();
  card = lastCard(page);
  await expect(card.locator('[data-testid$="-image-primary"]')).toBeVisible();
});

test('pages between two pictures in the viewer', async ({ page }) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-image').click();
  const card = lastCard(page);
  await card
    .locator('[data-testid$="-image-dropzone-input"]')
    .setInputFiles(pngPayload('one.png'));
  await expect(card.locator('[data-testid$="-image-primary"]')).toBeVisible();

  await card.hover();
  await card
    .locator('[data-testid$="-image-input"]')
    .setInputFiles(pngPayload('two.png'));

  await card.locator('[data-testid$="-image-primary"]').click();
  await expect(page.getByTestId('image-lightbox-counter')).toHaveText('1 / 2');
  await page.getByTestId('image-lightbox-next').click();
  await expect(page.getByTestId('image-lightbox-counter')).toHaveText('2 / 2');
  await page.getByTestId('image-lightbox-prev').click();
  await expect(page.getByTestId('image-lightbox-counter')).toHaveText('1 / 2');
});
