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

const gotoSplit = async (page: Page) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  await page.locator('a[href*="/split"]').first().click();
  await page.waitForURL(/\/split/);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();
};

const lastCard = (page: Page) =>
  page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]')
    .last();

test('opens the lightbox contained inside the right Split pane', async ({
  page,
}) => {
  await gotoSplit(page);

  await page.getByTestId('brain-canvas-tool-image').click();
  const card = lastCard(page);
  await card
    .locator('[data-testid$="-image-dropzone-input"]')
    .setInputFiles(pngPayload('shot.png'));

  const primary = card.locator('[data-testid$="-image-primary"]');
  await expect(primary).toBeVisible();
  await primary.click();

  const lightbox = page.getByTestId('image-lightbox');
  await expect(lightbox).toBeVisible();
  await expect(lightbox).toHaveAttribute('data-mode', 'contained');

  // The lightbox lives inside the right-pane container, not document.body.
  const rightPane = page.getByTestId('split-right-pane');
  const lightboxInPane = rightPane.getByTestId('image-lightbox');
  await expect(lightboxInPane).toHaveCount(1);

  // Expand toggle is available; shrink toggle is not.
  await expect(page.getByTestId('image-lightbox-expand')).toBeVisible();
  await expect(page.getByTestId('image-lightbox-shrink')).toHaveCount(0);
});

test('expands the contained lightbox to a full-viewport modal, then restores it', async ({
  page,
}) => {
  await gotoSplit(page);

  await page.getByTestId('brain-canvas-tool-image').click();
  const card = lastCard(page);
  await card
    .locator('[data-testid$="-image-dropzone-input"]')
    .setInputFiles(pngPayload('shot.png'));
  await card.locator('[data-testid$="-image-primary"]').click();

  const lightbox = page.getByTestId('image-lightbox');
  await expect(lightbox).toHaveAttribute('data-mode', 'contained');

  await page.getByTestId('image-lightbox-expand').click();
  await expect(lightbox).toHaveAttribute('data-mode', 'expanded');

  const rightPane = page.getByTestId('split-right-pane');
  await expect(rightPane.getByTestId('image-lightbox')).toHaveCount(0);

  await page.getByTestId('image-lightbox-shrink').click();
  await expect(lightbox).toHaveAttribute('data-mode', 'contained');
  await expect(rightPane.getByTestId('image-lightbox')).toHaveCount(1);
});

test('reopening the lightbox starts contained again after a prior expand', async ({
  page,
}) => {
  await gotoSplit(page);

  await page.getByTestId('brain-canvas-tool-image').click();
  const card = lastCard(page);
  await card
    .locator('[data-testid$="-image-dropzone-input"]')
    .setInputFiles(pngPayload('shot.png'));
  await card.locator('[data-testid$="-image-primary"]').click();

  await page.getByTestId('image-lightbox-expand').click();
  await expect(page.getByTestId('image-lightbox')).toHaveAttribute(
    'data-mode',
    'expanded',
  );
  await page.getByTestId('image-lightbox-close').click();
  await expect(page.getByTestId('image-lightbox')).toBeHidden();

  await card.locator('[data-testid$="-image-primary"]').click();
  await expect(page.getByTestId('image-lightbox')).toHaveAttribute(
    'data-mode',
    'contained',
  );
});
