import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

// A minimal, valid one-page PDF. pdfjs parses this with its recovery path, so
// these specs exercise the real worker + getDocument flow (no mocks).
const MINIMAL_PDF = [
  '%PDF-1.4',
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj',
  'trailer<</Root 1 0 R/Size 4>>',
  '%%EOF',
].join('\n');

const pdfPayload = (name: string) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.from(MINIMAL_PDF, 'latin1'),
});

// A row renders a container plus -select/-delete children that share the
// media-row- prefix, so match only the containers when counting.
const rowSelector =
  '[data-testid^="media-row-"]:not([data-testid$="-select"]):not([data-testid$="-delete"])';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('uploads, previews, searches and deletes a PDF in the media library', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/media`);

  await expect(page.getByTestId('media-empty')).toBeVisible();

  await page
    .getByTestId('media-upload-input')
    .setInputFiles(pdfPayload('attention.pdf'));

  const row = page.locator(rowSelector).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText('attention.pdf');

  // Selecting a row shows the preview pane.
  await page.locator('[data-testid$="-select"]').first().click();
  await expect(page.getByTestId('media-viewer')).toBeVisible();
  await expect(page.getByTestId('media-viewer-meta')).toContainText('1 pages');

  // Search filters the list.
  await page.getByTestId('media-search').fill('no-such-file');
  await expect(page.locator(rowSelector)).toHaveCount(0);
  await page.getByTestId('media-search').fill('');
  await expect(row).toBeVisible();

  // Delete returns the library to its empty state.
  await page.locator('[data-testid$="-delete"]').first().click();
  await expect(page.getByTestId('media-empty')).toBeVisible();
});

test('persists uploaded PDFs across a reload', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/media`);
  await page
    .getByTestId('media-upload-input')
    .setInputFiles(pdfPayload('persisted.pdf'));
  await expect(page.locator(rowSelector)).toHaveCount(1);

  await page.reload();
  const row = page.locator(rowSelector).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText('persisted.pdf');
});
