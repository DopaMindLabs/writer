import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { reseedAndGoHome, createSpaceFromTemplate } from './_helpers';

// Minimal, valid one-page PDF — exercises the real pdfjs worker + getDocument.
const MINIMAL_PDF = [
  '%PDF-1.4',
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj',
  'trailer<</Root 1 0 R/Size 4>>',
  '%%EOF',
].join('\n');

const pdfBuffer = Buffer.from(MINIMAL_PDF, 'latin1');

const pdfPayload = (name: string) => ({
  name,
  mimeType: 'application/pdf',
  buffer: pdfBuffer,
});

const addPdfCard = async (page: Page, spaceId: string) => {
  await page.goto(`/#/s/${spaceId}/brain-space`);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();
  await page.getByTestId('brain-canvas-tool-pdf').click();
  const card = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]')
    .last();
  await expect(card).toBeVisible();
  return card;
};

test('creates a PDF note by uploading in the picker and opens it beside the editor', async ({
  page,
}) => {
  await reseedAndGoHome(page);
  const spaceId = await createSpaceFromTemplate(page, 'humanities', {
    name: 'PDF Space',
    tag: 'pdf',
  });

  const card = await addPdfCard(page, spaceId);
  await card.locator('[data-testid$="-pdf-empty"]').click();
  await expect(page.getByTestId('media-picker-dialog')).toBeVisible();

  await page
    .getByTestId('media-upload-input')
    .setInputFiles(pdfPayload('paper.pdf'));

  await expect(page.getByTestId('media-picker-dialog')).toBeHidden();
  await expect(card.locator('[data-testid$="-pdf-thumb"]')).toBeVisible();
  await expect(card.locator('[data-testid$="-pdf-meta"]')).toContainText(
    'paper.pdf',
  );

  await card.locator('[data-testid$="-open-beside"]').click();
  await expect(page.getByTestId('media-reading-pane')).toBeVisible();

  // The library-sourced note persists across a reload (no re-fetch needed).
  await page.reload();
  const reloaded = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]')
    .last();
  await expect(reloaded.locator('[data-testid$="-pdf-thumb"]')).toBeVisible();
});

test('adds a PDF by URL, trusting the domain on first use', async ({ page }) => {
  await page.route('**/attention.pdf', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      headers: { 'access-control-allow-origin': '*' },
      body: pdfBuffer,
    }),
  );

  await reseedAndGoHome(page);
  const spaceId = await createSpaceFromTemplate(page, 'humanities', {
    name: 'URL Space',
    tag: 'url',
  });

  const card = await addPdfCard(page, spaceId);
  await card.locator('[data-testid$="-pdf-empty"]').click();
  await page.getByTestId('media-picker-tab-url').click();
  await page
    .getByTestId('media-picker-url-field')
    .fill('https://papers.example.org/attention.pdf');
  await page.getByTestId('media-picker-url-submit').click();

  const confirm = page.getByTestId('confirm-dialog');
  await expect(confirm).toContainText('Trust PDFs from papers.example.org');
  await page.getByTestId('confirm-dialog-confirm').click();

  await expect(page.getByTestId('media-picker-dialog')).toBeHidden();
  await expect(card.locator('[data-testid$="-pdf-thumb"]')).toBeVisible();
});

test('reverts the card to its empty state when the linked library item is deleted', async ({
  page,
}) => {
  await reseedAndGoHome(page);
  const spaceId = await createSpaceFromTemplate(page, 'humanities', {
    name: 'Delete Space',
    tag: 'del',
  });

  const card = await addPdfCard(page, spaceId);
  await card.locator('[data-testid$="-pdf-empty"]').click();
  await page
    .getByTestId('media-upload-input')
    .setInputFiles(pdfPayload('linked.pdf'));
  await expect(card.locator('[data-testid$="-pdf-thumb"]')).toBeVisible();

  // Delete the item from the library; the note stays but loses its source.
  await page.goto(`/#/s/${spaceId}/media`);
  await page.locator('[data-testid$="-delete"]').first().click();
  await expect(page.getByTestId('media-empty')).toBeVisible();

  await page.goto(`/#/s/${spaceId}/brain-space`);
  const reverted = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]')
    .last();
  await expect(reverted.locator('[data-testid$="-pdf-empty"]')).toBeVisible();
});
