import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome, expectNoA11yViolations } from './_helpers';

const TINY_PDF = 'e2e/fixtures/tiny.pdf';
const STRUCTURE_ONLY = { disableRules: ['color-contrast'] };

const gotoLibrary = async (page: Page): Promise<string> => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/library`);
  await expect(page.getByTestId('media-library-screen')).toBeVisible();
  return spaceId;
};

const uploadAndOpen = async (page: Page): Promise<void> => {
  await page.getByTestId('media-upload-input').setInputFiles(TINY_PDF);
  await page.locator('[data-testid^="media-card-"][data-testid$="-open"]').first().click();
  await expect(page.getByTestId('pdf-viewer')).toBeVisible();
  await expect(page.getByTestId('pdf-page').locator('canvas')).toBeVisible();
  await expect(page.getByTestId('pdf-page')).toContainText('Lorem ipsum highlights beautifully.');
};

/**
 * Selection helper (PE.7 GO/NO-GO contingency, resolved): a real headless mouse
 * drag over pdf.js's transparent text-layer glyphs did not produce a selection
 * across two honest attempts (0/3 each) — the same reason this repo's editor
 * specs select via the keyboard, not drag. So every test uses the documented
 * equivalent (PE.2 design): build a Range over the text-layer span and dispatch
 * `pointerup`, driving the identical Selection-API code path the drag would.
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

const strip = (page: Page) => page.getByTestId('pdf-selection-strip');
const mark = (page: Page) => page.getByTestId('pdf-highlight-mark');

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
  await gotoLibrary(page);
  await uploadAndOpen(page);
});

test('selecting text summons the strip with five colours', async ({ page }) => {
  await select(page);
  await expect(strip(page)).toBeVisible();
  await expect(page.locator('[data-testid^="strip-color-"]')).toHaveCount(5);
});

test('a colour dot applies a highlight and dismisses the strip', async ({ page }) => {
  await select(page);
  await expect(strip(page)).toBeVisible();
  await page.getByTestId('strip-color-green').click();
  await expect(mark(page)).toHaveAttribute('data-color', 'green');
  await expect(mark(page)).toHaveAttribute('data-kind', 'highlight');
  await expect(strip(page)).toHaveCount(0);
});

test('underline and strikethrough apply their kinds', async ({ page }) => {
  await select(page);
  await page.getByTestId('strip-underline').click();
  await expect(mark(page)).toHaveAttribute('data-kind', 'underline');
  await expect(strip(page)).toHaveCount(0);

  await select(page);
  await page.getByTestId('strip-strikethrough').click();
  await expect(page.locator('[data-testid="pdf-highlight-mark"][data-kind="strikethrough"]')).toBeVisible();
});

test('the note action grows the strip and saves a note', async ({ page }) => {
  await select(page);
  await page.getByTestId('strip-note').click();
  await page.getByTestId('strip-note-input').fill('warm-up window');
  await page.getByTestId('strip-note-input').press('Enter');
  await expect(mark(page)).toBeVisible();

  await mark(page).click({ button: 'right' });
  await expect(page.getByTestId('mark-edit-note')).toHaveText('Edit note…');
  await page.keyboard.press('Escape');

  await page.reload();
  await mark(page).click({ button: 'right' });
  await expect(page.getByTestId('mark-edit-note')).toHaveText('Edit note…');
});

test('escape dismisses the strip without applying', async ({ page }) => {
  await select(page);
  await expect(strip(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(strip(page)).toHaveCount(0);
  await expect(mark(page)).toHaveCount(0);
});

test('context menu recolours and removes a mark', async ({ page }) => {
  await select(page);
  await page.getByTestId('strip-color-yellow').click();
  await expect(mark(page)).toBeVisible();

  await mark(page).click({ button: 'right' });
  await page.getByTestId('mark-color-pink').click();
  await expect(mark(page)).toHaveAttribute('data-color', 'pink');

  await mark(page).click({ button: 'right' });
  await page.getByTestId('mark-remove').click();
  await expect(mark(page)).toHaveCount(0);
});

test('annotations persist across reload', async ({ page }) => {
  await select(page);
  await page.getByTestId('strip-color-blue').click();
  await expect(mark(page)).toHaveAttribute('data-color', 'blue');

  await page.reload();
  await expect(page.getByTestId('pdf-page').locator('canvas')).toBeVisible();
  await expect(mark(page)).toHaveAttribute('data-color', 'blue');
  await expect(mark(page)).toHaveAttribute('data-kind', 'highlight');
});

test('strip and marks have no detectable a11y violations', async ({ page }) => {
  await select(page);
  await page.getByTestId('strip-color-green').click();
  await expect(mark(page)).toBeVisible();
  // Wait for the first strip to fully dismiss (the apply clears the stash) so
  // the re-selection below can't be cancelled by that trailing clear.
  await expect(strip(page)).toHaveCount(0);
  await select(page);
  await expect(strip(page)).toBeVisible();
  await expectNoA11yViolations(page, { context: 'pdf selection strip', ...STRUCTURE_ONLY });
});
