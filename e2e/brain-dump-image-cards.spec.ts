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
  await page.goto(`/#/s/${spaceId}/brain-space`);
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

test('opens and removes pictures from the card itself', async ({ page }) => {
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

  // The extra thumbnail opens the viewer at its own picture, not the first.
  const thumbOpen = card.locator('[data-testid$="-open"]');
  await expect(thumbOpen).toHaveCount(1);
  await thumbOpen.click();
  await expect(page.getByTestId('image-lightbox-counter')).toHaveText('2 / 2');
  await page.keyboard.press('Escape');

  // Removing the extra from its thumbnail leaves the primary standing.
  await card.hover();
  await card.locator('[data-testid$="-open"]').hover();
  await card.locator('[data-testid$="-remove"]').last().click();
  await expect(card.locator('[data-testid$="-open"]')).toHaveCount(0);
  await expect(card.locator('[data-testid$="-image-primary"]')).toBeVisible();

  // Removing the primary returns the card to its drop zone.
  await card.locator('[data-testid$="-image-primary"]').hover();
  await card.locator('[data-testid$="-remove"]').click();
  await expect(card.locator('[data-testid$="-image-dropzone"]')).toBeVisible();
});

test('a text note lists its pictures in a strip and opens them from it', async ({
  page,
}) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-question').click();
  const card = lastCard(page);
  await card.hover();
  await card.locator('[data-testid$="-open-details"]').click();
  const drawer = page.getByTestId('brain-detail-drawer');
  await expect(drawer).toBeVisible();
  await drawer
    .getByTestId('brain-detail-drawer-attachments-input')
    .setInputFiles(pngPayload('strip.png'));
  await expect(drawer.getByRole('img', { name: 'strip.png' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();

  const strip = card.locator('[data-testid$="-images"]');
  await expect(strip).toBeVisible();
  await card.locator('[data-testid$="-open"]').click();
  await expect(page.getByTestId('image-lightbox')).toBeVisible();
  await page.keyboard.press('Escape');

  await card.hover();
  await card.locator('[data-testid$="-open"]').hover();
  await card.locator('[data-testid$="-remove"]').click();
  await expect(card.locator('[data-testid$="-images"]')).toHaveCount(0);
});

test('an existing title opens back into its editor from the card', async ({
  page,
}) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-question').click();
  const card = lastCard(page);
  await card.hover();
  await card.locator('[data-testid$="-add-title"]').click();
  await card.locator('[data-testid$="-title-input"]').fill('First words');
  await card.locator('[data-testid$="-title-input"]').press('Enter');
  await expect(card.locator('[data-testid$="-title"]')).toHaveText('First words');

  await card.locator('[data-testid$="-title"]').click();
  await expect(card.locator('[data-testid$="-title-input"]')).toBeVisible();
  await card.locator('[data-testid$="-title-input"]').press('Escape');
  await expect(card.locator('[data-testid$="-title"]')).toHaveText('First words');
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
