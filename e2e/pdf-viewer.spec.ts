import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import {
  reseedAndGoHome,
  getFirstSpaceIdFromHome,
  expectNoA11yViolations,
} from './_helpers';

const TINY_PDF = 'e2e/fixtures/tiny.pdf';
const TWO_PAGE_PDF = 'e2e/fixtures/two-page.pdf';

// Chrome micro-meta (faint counts, version string) is intentionally low-contrast
// in the default theme; full contrast is asserted in the hc-* themes. This scan
// checks structure and semantics for the viewer surface.
const STRUCTURE_ONLY = { disableRules: ['color-contrast'] };

const gotoLibrary = async (page: Page): Promise<string> => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/library`);
  await expect(page.getByTestId('media-library-screen')).toBeVisible();
  return spaceId;
};

const uploadAndOpen = async (page: Page, file: string): Promise<void> => {
  await page.getByTestId('media-upload-input').setInputFiles(file);
  await page
    .locator('[data-testid^="media-card-"][data-testid$="-open"]')
    .first()
    .click();
  await expect(page.getByTestId('pdf-viewer')).toBeVisible();
};

const pdfPage = (page: Page) => page.getByTestId('pdf-page');

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('renders the tiny fixture to a canvas with a text layer', async ({ page }) => {
  await gotoLibrary(page);
  await uploadAndOpen(page, TINY_PDF);

  // One assertion proves four things at once: the worker loaded same-origin
  // (no CSP violation — the failOnCspViolation fixture would fail otherwise),
  // the bytes survived the copy discipline, pdf.js rendered a real canvas, and
  // the text layer holds the actual document text.
  await expect(pdfPage(page).locator('canvas')).toBeVisible();
  await expect(pdfPage(page)).toContainText('Lorem ipsum highlights beautifully.');
});

test('navigates between pages of the two-page fixture', async ({ page }) => {
  await gotoLibrary(page);
  await uploadAndOpen(page, TWO_PAGE_PDF);

  await expect(page.getByTestId('pdf-page-readout')).toContainText('Page 1 / 2');
  await expect(pdfPage(page)).toContainText('Page one of the fixture.');

  await page.getByRole('button', { name: 'Next page' }).click();

  await expect(page.getByTestId('pdf-page-readout')).toContainText('Page 2 / 2');
  await expect(pdfPage(page)).toContainText('Page two of the fixture.');
});

test('recovers from a corrupt pdf with a retry', async ({ page }) => {
  const spaceId = await gotoLibrary(page);

  // Upload validation blocks corrupt files, so seed the row directly: a blob
  // that keeps the %PDF signature but is otherwise unparseable drives the
  // viewer's document-load error path.
  await page.evaluate(async (space) => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 1, 2, 3]);
    await (window as unknown as { db: { media: { put: (r: unknown) => Promise<unknown> } } }).db.media.put({
      id: 'corrupt-1',
      spaceId: space,
      name: 'broken.pdf',
      mime: 'application/pdf',
      size: bytes.byteLength,
      pageCount: 1,
      blob: new Blob([bytes], { type: 'application/pdf' }),
      createdAt: 1,
      updatedAt: 1,
    });
  }, spaceId);

  await page.goto(`/#/s/${spaceId}/library/corrupt-1`);

  const errorBanner = page.getByTestId('pdf-status-error');
  await expect(errorBanner).toBeVisible();

  // Retrying re-copies the retained bytes; the same corrupt data errors again.
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(errorBanner).toBeVisible();
});

test('viewer has no detectable a11y violations', async ({ page }) => {
  await gotoLibrary(page);
  await uploadAndOpen(page, TINY_PDF);
  await expect(pdfPage(page).locator('canvas')).toBeVisible();

  await expectNoA11yViolations(page, {
    context: 'pdf viewer',
    ...STRUCTURE_ONLY,
  });
});
