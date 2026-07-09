import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import {
  reseedAndGoHome,
  getFirstSpaceIdFromHome,
  expectNoA11yViolations,
} from './_helpers';

const TINY_PDF = 'e2e/fixtures/tiny.pdf';
const TWO_PAGE_PDF = 'e2e/fixtures/two-page.pdf';
const STRUCTURE_ONLY = { disableRules: ['color-contrast'] };

const TINY_BYTES = Array.from(readFileSync(TINY_PDF));

const gotoLibrary = async (page: Page): Promise<string> => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/library`);
  await expect(page.getByTestId('media-library-screen')).toBeVisible();
  return spaceId;
};

const upload = async (page: Page, file: string): Promise<void> => {
  await page.getByTestId('media-upload-input').setInputFiles(file);
};

const openFirstRow = async (page: Page): Promise<void> => {
  await page.locator('[data-testid^="media-row-"][data-testid$="-open"]').first().click();
  await expect(page.getByTestId('pdf-viewer')).toBeVisible();
  await expect(page.getByTestId('pdf-page').locator('canvas')).toBeVisible();
};

// Build a Range over the current page's first text-layer span and dispatch
// pointerup — the documented Selection-API path (a headless drag does not select).
const highlightFirstLine = async (page: Page): Promise<void> => {
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
  await page.getByTestId('strip-color-yellow').click();
  await expect(page.getByTestId('pdf-highlight-mark')).toBeVisible();
};

const seedMedia = (
  page: Page,
  spaceId: string,
  records: { id: string; name: string; createdAt: number }[],
): Promise<void> =>
  page.evaluate(
    async ({ spaceId, records }) => {
      const database = (window as unknown as { db: { media: { put: (r: unknown) => Promise<unknown> } } }).db;
      for (const record of records) {
        await database.media.put({
          id: record.id,
          spaceId,
          name: record.name,
          mime: 'application/pdf',
          size: 4,
          pageCount: 1,
          blob: new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], {
            type: 'application/pdf',
          }),
          createdAt: record.createdAt,
          updatedAt: record.createdAt,
        });
      }
    },
    { spaceId, records },
  );

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('rows render columns with a highlight count', async ({ page }) => {
  await gotoLibrary(page);
  await upload(page, TINY_PDF);
  await openFirstRow(page);
  await highlightFirstLine(page);

  await page.goBack();
  await expect(page.getByTestId('media-library-screen')).toBeVisible();
  await expect(page.getByTestId('media-row-highlights')).toContainText('1 highlight');
});

test('header counts total pdfs and annotations', async ({ page }) => {
  await gotoLibrary(page);
  await upload(page, TINY_PDF);
  await openFirstRow(page);
  await highlightFirstLine(page);
  await page.goBack();

  await expect(page.getByTestId('media-library-counts')).toContainText('1 PDFs');
  await expect(page.getByTestId('media-library-counts')).toContainText('1 annotations');
});

test('search narrows the list', async ({ page }) => {
  await gotoLibrary(page);
  await upload(page, TINY_PDF);
  await upload(page, TWO_PAGE_PDF);
  await expect(page.locator('[data-testid^="media-row-"][data-testid$="-open"]')).toHaveCount(2);

  await page.getByTestId('media-library-search').fill('two-page');
  await expect(page.getByText('two-page.pdf')).toBeVisible();
  await expect(page.getByText('tiny.pdf')).toBeHidden();
});

test('opening a pdf clears it from unread', async ({ page }) => {
  await gotoLibrary(page);
  await upload(page, TINY_PDF);

  await page.getByTestId('media-library-filter-unread').click();
  await expect(page.getByText('tiny.pdf')).toBeVisible();

  await openFirstRow(page);
  await page.goBack();
  await expect(page.getByTestId('media-library-screen')).toBeVisible();

  await page.getByTestId('media-library-filter-unread').click();
  await expect(page.getByText('tiny.pdf')).toBeHidden();
});

test('annotated filter shows only highlighted pdfs', async ({ page }) => {
  await gotoLibrary(page);
  await upload(page, TINY_PDF);
  await upload(page, TWO_PAGE_PDF);
  await openFirstRow(page);
  await highlightFirstLine(page);
  await page.goBack();
  await expect(page.getByTestId('media-library-screen')).toBeVisible();

  await page.getByTestId('media-library-filter-annotated').click();
  // Exactly one row survives — the highlighted pdf.
  await expect(page.locator('[data-testid^="media-row-"][data-testid$="-open"]')).toHaveCount(1);
});

test('sort by name reorders and flattens the groups', async ({ page }) => {
  const spaceId = await gotoLibrary(page);
  const now = await page.evaluate(() => Date.now());
  await seedMedia(page, spaceId, [
    { id: 'z', name: 'Zebra.pdf', createdAt: now },
    { id: 'a', name: 'Apple.pdf', createdAt: Date.UTC(2023, 9, 15, 12) },
  ]);
  await page.reload();
  await expect(page.getByTestId('media-library-screen')).toBeVisible();
  await expect(page.getByTestId('media-library-group').first()).toBeVisible();

  await page.getByTestId('media-library-sort').click();
  await page.getByTestId('media-library-sort-name').click();
  // Name sort is flat — no date group headers — and A–Z ordered.
  await expect(page.getByTestId('media-library-group')).toHaveCount(0);
  await expect(page.getByText('Apple.pdf')).toBeVisible();
  await expect(page.getByText('Zebra.pdf')).toBeVisible();
});

test('date group labels render', async ({ page }) => {
  const spaceId = await gotoLibrary(page);
  const now = await page.evaluate(() => Date.now());
  await seedMedia(page, spaceId, [
    { id: 'week', name: 'This week.pdf', createdAt: now - 3 * 86_400_000 },
    { id: 'oct', name: 'October.pdf', createdAt: Date.UTC(2023, 9, 15, 12) },
  ]);
  await page.reload();
  await expect(page.getByTestId('media-library-screen')).toBeVisible();

  await expect(page.getByText('Earlier this week')).toBeVisible();
  await expect(page.getByText('OCTOBER 2023')).toBeVisible();
});

test('dropping a pdf on the page adds it', async ({ page }) => {
  await gotoLibrary(page);
  await expect(page.getByTestId('media-library-empty')).toBeVisible();

  await page.evaluate((bytes) => {
    const surface = document.querySelector('[data-testid="media-library-surface"]');
    if (!surface) throw new Error('no library surface');
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([new Uint8Array(bytes)], 'dropped.pdf', { type: 'application/pdf' }),
    );
    surface.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: transfer }));
    surface.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
  }, TINY_BYTES);

  await expect(page.getByText('dropped.pdf')).toBeVisible();
});

test('library list has no detectable a11y violations', async ({ page }) => {
  await gotoLibrary(page);
  await upload(page, TINY_PDF);
  await expect(page.getByText('tiny.pdf')).toBeVisible();
  await expectNoA11yViolations(page, {
    context: 'media library list',
    ...STRUCTURE_ONLY,
  });
});
