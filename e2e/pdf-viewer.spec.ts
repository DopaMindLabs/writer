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

test('text layer overlays the canvas as an invisible, selectable layer', async ({ page }) => {
  await gotoLibrary(page);
  await uploadAndOpen(page, TINY_PDF);
  await expect(pdfPage(page).locator('canvas')).toBeVisible();

  const textSpan = page.locator('.textLayer span').first();
  await expect(textSpan).toHaveText('Lorem ipsum highlights beautifully.');

  // react-pdf's layer stylesheet must load: without it the text-layer spans have
  // no positioning and render as opaque glyphs stacked below the canvas — nothing
  // is overlaid on the page to drag-select. A real headless drag over pdf.js
  // glyphs is unreliable (see pdf-annotation-strip's select helper), so guard the
  // geometry instead: the layer must sit exactly over the canvas and be
  // transparent, both of which fail when the CSS is missing.
  const canvasBox = await pdfPage(page).locator('canvas').boundingBox();
  const layerBox = await page.locator('.textLayer').boundingBox();
  if (!canvasBox || !layerBox) throw new Error('expected canvas and text layer to be laid out');

  const TOLERANCE = 2;
  expect(layerBox.y).toBeGreaterThanOrEqual(canvasBox.y - TOLERANCE);
  expect(layerBox.y + layerBox.height).toBeLessThanOrEqual(canvasBox.y + canvasBox.height + TOLERANCE);
  expect(layerBox.x).toBeGreaterThanOrEqual(canvasBox.x - TOLERANCE);
  expect(layerBox.x + layerBox.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width + TOLERANCE);

  const spanColor = await textSpan.evaluate((el) => getComputedStyle(el).color);
  expect(spanColor).toBe('rgba(0, 0, 0, 0)');
});

test('zoom controls scale the page and reset', async ({ page }) => {
  await gotoLibrary(page);
  await uploadAndOpen(page, TINY_PDF);
  await expect(pdfPage(page).locator('canvas')).toBeVisible();

  const zoom = page.getByTestId('pdf-zoom');
  await expect(zoom).toBeVisible();
  await expect(page.getByTestId('pdf-zoom-reset')).toHaveText('100%');

  const widthNow = async (): Promise<number> =>
    (await pdfPage(page).locator('canvas').boundingBox())?.width ?? 0;
  const base = await widthNow();

  // Zoom in bumps the readout and grows the rendered canvas.
  await page.getByTestId('pdf-zoom-in').click();
  await expect(page.getByTestId('pdf-zoom-reset')).toHaveText('125%');
  await expect.poll(widthNow).toBeGreaterThan(base);

  // The readout resets zoom back to 100% and the base size.
  await page.getByTestId('pdf-zoom-reset').click();
  await expect(page.getByTestId('pdf-zoom-reset')).toHaveText('100%');
  await expect.poll(widthNow).toBe(base);

  // Zoom out drops below 100%.
  await page.getByTestId('pdf-zoom-out').click();
  await expect(page.getByTestId('pdf-zoom-reset')).toHaveText('75%');
  await expect.poll(widthNow).toBeLessThan(base);
});

test('navigates between pages of the two-page fixture', async ({ page }) => {
  await gotoLibrary(page);
  await uploadAndOpen(page, TWO_PAGE_PDF);

  await expect(page.getByTestId('pdf-pager')).toContainText('1 / 2');
  await expect(pdfPage(page)).toContainText('Page one of the fixture.');

  await page.getByTestId('pdf-pager-next').click();

  await expect(page.getByTestId('pdf-pager')).toContainText('2 / 2');
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
