import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import {
  reseedAndGoHome,
  getFirstSpaceIdFromHome,
  expectNoA11yViolations,
} from './_helpers';

const TINY_PDF = 'e2e/fixtures/tiny.pdf';
const CORRUPT_PDF = 'e2e/fixtures/corrupt.pdf';

// Match the established default-theme scan: chrome micro-meta (ink-4 counts,
// version string) is intentionally faint, so full contrast is asserted only in
// the hc-* themes. This scan checks structure and semantics for the surface.
const STRUCTURE_ONLY = { disableRules: ['color-contrast'] };

const cardName = (page: Page) =>
  page.locator('[data-testid^="media-card-"][data-testid$="-name"]');

const cardMeta = (page: Page) =>
  page.locator('[data-testid^="media-card-"][data-testid$="-meta"]');

const cards = (page: Page) =>
  page.locator('[data-testid^="media-card-"][data-testid$="-open"]');

const gotoLibrary = async (page: Page): Promise<void> => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/library`);
  await expect(page.getByTestId('media-library-screen')).toBeVisible();
};

const uploadPdf = async (page: Page, file: string): Promise<void> => {
  await page.getByTestId('media-upload-input').setInputFiles(file);
};

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('uploads a pdf and shows its card', async ({ page }) => {
  await gotoLibrary(page);
  await expect(page.getByTestId('media-library-empty')).toBeVisible();

  await uploadPdf(page, TINY_PDF);

  await expect(cardName(page)).toHaveText('tiny.pdf');
  await expect(cardMeta(page)).toContainText('1 page');
  await expect(page.getByTestId('media-library-empty')).toBeHidden();
});

test('rejects a corrupt pdf with a warning', async ({ page }) => {
  await gotoLibrary(page);

  await uploadPdf(page, CORRUPT_PDF);

  const banner = page.getByTestId('media-upload-reject-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('corrupt.pdf');
  await expect(cards(page)).toHaveCount(0);
});

test('persists media across reload', async ({ page }) => {
  await gotoLibrary(page);
  await uploadPdf(page, TINY_PDF);
  await expect(cardName(page)).toHaveText('tiny.pdf');

  await page.reload();

  await expect(cardName(page)).toHaveText('tiny.pdf');
});

test('deletes a pdf after confirmation', async ({ page }) => {
  await gotoLibrary(page);
  await uploadPdf(page, TINY_PDF);
  await expect(cardName(page)).toHaveText('tiny.pdf');

  const card = page.getByTestId('media-library-grid').locator('li').first();
  await card.hover();
  await card.locator('[data-testid$="-delete"]').click();
  await page.getByTestId('confirm-dialog-confirm').click();

  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByTestId('media-library-empty')).toBeVisible();
});

test('media library has no detectable a11y violations', async ({ page }) => {
  await gotoLibrary(page);
  await expect(page.getByTestId('media-library-empty')).toBeVisible();
  await expectNoA11yViolations(page, {
    context: 'media library',
    ...STRUCTURE_ONLY,
  });
});
