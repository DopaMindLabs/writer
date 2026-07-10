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
// checks structure and semantics for the reader chrome.
const STRUCTURE_ONLY = { disableRules: ['color-contrast'] };

const pdfPage = (page: Page) => page.getByTestId('pdf-page');

const gotoLibrary = async (page: Page): Promise<string> => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/library`);
  await expect(page.getByTestId('media-library-screen')).toBeVisible();
  return spaceId;
};

const openViewer = async (page: Page, file: string): Promise<void> => {
  await page.getByTestId('media-upload-input').setInputFiles(file);
  await page
    .locator('[data-testid^="media-row-"][data-testid$="-open"]')
    .first()
    .click();
  await expect(page.getByTestId('pdf-viewer')).toBeVisible();
  await expect(pdfPage(page).locator('canvas')).toBeVisible();
};

/**
 * Selection helper (shared with pdf-annotation-strip): a real headless drag over
 * pdf.js's transparent text-layer glyphs does not select, so build a Range over
 * the current page's first span and dispatch `pointerup` — the identical
 * Selection-API path the drag would drive.
 */
const select = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const span = document.querySelector('.textLayer span');
    if (!span?.firstChild) throw new Error('no text-layer span to select');
    const range = document.createRange();
    range.selectNodeContents(span);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    span.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
};

const makeHighlight = async (page: Page, color = 'yellow'): Promise<void> => {
  await select(page);
  await expect(page.getByTestId('pdf-selection-strip')).toBeVisible();
  await page.getByTestId(`strip-color-${color}`).click();
  await expect(page.getByTestId('pdf-highlight-mark')).toBeVisible();
  await expect(page.getByTestId('pdf-selection-strip')).toHaveCount(0);
};

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('reader shows no standing toolbar', async ({ page }) => {
  await gotoLibrary(page);
  await openViewer(page, TWO_PAGE_PDF);

  // The standing toolbar was removed in PG.2; at rest only the quiet pager and
  // the glyph rail are chrome, and no selection strip is summoned.
  await expect(page.getByTestId('pdf-toolbar')).toHaveCount(0);
  await expect(page.getByTestId('pdf-selection-strip')).toHaveCount(0);
  await expect(page.getByTestId('pdf-pager')).toBeVisible();
  await expect(page.getByTestId('pdf-reader-rail')).toBeVisible();
});

test('pager navigates and folds under the thumbnails', async ({ page }) => {
  await gotoLibrary(page);
  await openViewer(page, TWO_PAGE_PDF);

  await expect(page.getByTestId('pdf-pager')).toContainText('1 / 2');
  await page.getByTestId('pdf-pager-next').click();
  await expect(page.getByTestId('pdf-pager')).toContainText('2 / 2');

  // Opening the thumbnail column takes over navigation: the centre pager hides
  // and the column's docked foot pager appears in its place.
  await page.getByTestId('pdf-thumbs-toggle').click();
  await expect(page.getByTestId('pdf-thumb-rail')).toBeVisible();
  await expect(page.getByTestId('pdf-pager')).toHaveCount(0);
  await expect(page.getByTestId('pdf-thumb-pager')).toContainText('2 / 2');
});

test('rail glyph opens the highlights panel with a count', async ({ page }) => {
  await gotoLibrary(page);
  await openViewer(page, TINY_PDF);
  await makeHighlight(page, 'green');

  // The count badge tracks the highlight total on the ¶ glyph.
  await expect(page.getByTestId('pdf-rail-highlights-count')).toHaveText('1');

  await page.getByTestId('pdf-rail-highlights').click();
  const panel = page.getByTestId('pdf-reader-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Highlights & notes');
  await expect(panel).toContainText('1');
});

test('panel row jumps to the page and focuses the mark', async ({ page }) => {
  await gotoLibrary(page);
  await openViewer(page, TWO_PAGE_PDF);

  // Highlight a word on page 2, then step back to page 1.
  await page.getByTestId('pdf-pager-next').click();
  await expect(page.getByTestId('pdf-pager')).toContainText('2 / 2');
  await makeHighlight(page, 'blue');
  await page.getByTestId('pdf-pager-prev').click();
  await expect(page.getByTestId('pdf-pager')).toContainText('1 / 2');
  await expect(page.getByTestId('pdf-highlight-mark')).toHaveCount(0);

  // Activating the row returns the reader to page 2 and focuses the mark.
  await page.getByTestId('pdf-rail-highlights').click();
  await page.getByTestId('annotation-row').click();
  await expect(page.getByTestId('pdf-pager')).toContainText('2 / 2');
  await expect(page.getByTestId('pdf-highlight-mark')).toBeFocused();
});

test('info panel lists the file facts', async ({ page }) => {
  await gotoLibrary(page);
  await openViewer(page, TWO_PAGE_PDF);

  await page.getByTestId('pdf-rail-info').click();
  const info = page.getByTestId('pdf-info-panel');
  await expect(info).toBeVisible();
  await expect(info).toContainText('two-page.pdf');
  await expect(info).toContainText('Pages');
  await expect(info).toContainText('2');
  await expect(info).toContainText('Size');
  await expect(info).toContainText('Added');
});

test('side panel icon hides the rail and is remembered per document', async ({
  page,
}) => {
  const spaceId = await gotoLibrary(page);
  await page.getByTestId('media-upload-input').setInputFiles(TINY_PDF);
  await page.getByTestId('media-upload-input').setInputFiles(TWO_PAGE_PDF);
  const openButtons = page.locator(
    '[data-testid^="media-row-"][data-testid$="-open"]',
  );
  await expect(openButtons).toHaveCount(2);
  const ids = (
    await openButtons.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-testid') ?? ''),
    )
  ).map((testId) => testId.replace('media-row-', '').replace('-open', ''));
  const [docA, docB] = ids;

  const openDoc = async (id: string): Promise<void> => {
    await page.goto(`/#/s/${spaceId}/library/${id}`);
    await expect(page.getByTestId('pdf-viewer')).toBeVisible();
  };

  // Hide the rail on doc A.
  await openDoc(docA);
  await expect(page.getByTestId('pdf-reader-rail')).toBeVisible();
  await page.getByTestId('pdf-rail-toggle').click();
  await expect(page.getByTestId('pdf-reader-rail')).toHaveCount(0);

  // Doc B keeps its own (default) visible rail.
  await openDoc(docB);
  await expect(page.getByTestId('pdf-reader-rail')).toBeVisible();

  // Returning to doc A remembers the hidden rail, and a reload holds both.
  await openDoc(docA);
  await expect(page.getByTestId('pdf-reader-rail')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('pdf-reader-rail')).toHaveCount(0);
  await openDoc(docB);
  await expect(page.getByTestId('pdf-reader-rail')).toBeVisible();
});

test('thumbnails show ticks and navigate', async ({ page }) => {
  await gotoLibrary(page);
  await openViewer(page, TWO_PAGE_PDF);
  await makeHighlight(page, 'pink');

  await page.getByTestId('pdf-thumbs-toggle').click();
  await expect(page.getByTestId('pdf-thumb-rail')).toBeVisible();

  // The highlighted page's thumbnail carries a colour tick.
  await expect(
    page.getByTestId('pdf-thumb-1').getByTestId('pdf-thumb-tick'),
  ).toHaveCount(1);

  // Clicking a thumbnail moves the reader to that page.
  await page.getByTestId('pdf-thumb-2').click();
  await expect(page.getByTestId('pdf-thumb-pager')).toContainText('2 / 2');
});

test('the overflow menu opens the library', async ({ page }) => {
  await gotoLibrary(page);
  await openViewer(page, TINY_PDF);

  await page.getByTestId('pdf-rail-overflow').click();
  await page.getByRole('menuitem', { name: 'Open library' }).click();
  await expect(page.getByTestId('media-library-screen')).toBeVisible();
});

test('reader chrome has no detectable a11y violations', async ({ page }) => {
  await gotoLibrary(page);
  await openViewer(page, TINY_PDF);
  await makeHighlight(page, 'yellow');

  // Open every piece of chrome at once: the rail, a side panel, and the thumbs.
  await page.getByTestId('pdf-rail-highlights').click();
  await expect(page.getByTestId('pdf-reader-panel')).toBeVisible();
  await page.getByTestId('pdf-thumbs-toggle').click();
  await expect(page.getByTestId('pdf-thumb-rail')).toBeVisible();

  await expectNoA11yViolations(page, {
    context: 'pdf reader chrome',
    ...STRUCTURE_ONLY,
  });
});
