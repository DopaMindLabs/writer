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
  await page.locator('[data-testid^="media-row-"][data-testid$="-open"]').first().click();
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

// Marks are pointer-transparent so they never block text selection; a real
// right-click therefore lands on the text layer and is resolved to a mark by
// geometry. Drive it by coordinates over the mark rather than clicking the
// (pointer-events: none) button, which Playwright could not action.
const rightClickMark = async (page: Page): Promise<void> => {
  const box = await mark(page).first().boundingBox();
  if (!box) throw new Error('no mark to right-click');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
};

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

  await rightClickMark(page);
  await expect(page.getByTestId('mark-edit-note')).toHaveText('Edit note…');
  await page.keyboard.press('Escape');

  await page.reload();
  await rightClickMark(page);
  await expect(page.getByTestId('mark-edit-note')).toHaveText('Edit note…');
});

test('re-highlighting the same text overrides the colour and keeps the note', async ({ page }) => {
  await select(page);
  await page.getByTestId('strip-note').click();
  await page.getByTestId('strip-note-input').fill('keep me');
  await page.getByTestId('strip-note-input').press('Enter');
  await expect(mark(page)).toBeVisible();
  await expect(strip(page)).toHaveCount(0);

  await select(page);
  await page.getByTestId('strip-color-pink').click();
  // The earlier mark is replaced, not stacked, and recoloured.
  await expect(page.locator('[data-testid="pdf-highlight-mark"]')).toHaveCount(1);
  await expect(mark(page)).toHaveAttribute('data-color', 'pink');
  // The note survived the override.
  await rightClickMark(page);
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

  await rightClickMark(page);
  await page.getByTestId('mark-color-pink').click();
  await expect(mark(page)).toHaveAttribute('data-color', 'pink');

  await rightClickMark(page);
  await page.getByTestId('mark-remove').click();
  await expect(mark(page)).toHaveCount(0);
});

test('editing a note from the context menu saves it', async ({ page }) => {
  await select(page);
  await page.getByTestId('strip-color-yellow').click();
  await expect(mark(page)).toBeVisible();

  await rightClickMark(page);
  await page.getByTestId('mark-edit-note').click();
  await expect(page.getByTestId('pdf-mark-note-editor')).toBeVisible();
  await page.getByTestId('strip-note-input').fill('a considered note');
  await page.getByTestId('strip-note-input').press('Enter');
  await expect(page.getByTestId('pdf-mark-note-editor')).toHaveCount(0);

  // The note persisted onto the mark, so the menu still offers to edit it.
  await rightClickMark(page);
  await expect(page.getByTestId('mark-edit-note')).toHaveText('Edit note…');
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

test('highlight tints blend with the page instead of painting solid', async ({ page }) => {
  await select(page);
  await page.getByTestId('strip-color-yellow').click();
  await expect(mark(page)).toBeVisible();

  // The layer multiplies against the canvas glyphs as one isolated group, so the
  // highlighted text stays legible and overlapping tints never compound. That
  // only reaches the canvas while the overlay is *not* an isolated stacking
  // context — a `z-index` on it would confine the blend and paint the tint solid.
  // Guard: the layer carries the group blend, and the overlay keeps `z-index: auto`.
  const layer = page.getByTestId('pdf-highlight-layer');
  await expect(layer).toHaveCSS('mix-blend-mode', 'multiply');
  await expect(layer).toHaveCSS('isolation', 'isolate');
  const overlayZ = await page
    .getByTestId('pdf-page-overlay')
    .evaluate((el) => getComputedStyle(el).zIndex);
  expect(overlayZ).toBe('auto');
});

test('an existing mark never blocks text selection', async ({ page }) => {
  await select(page);
  await page.getByTestId('strip-color-yellow').click();
  await expect(mark(page)).toBeVisible();

  // The mark's hit target is pointer-transparent, so a pointer over a highlight
  // reaches the text layer beneath and selection starts and drags over a
  // highlight exactly as over bare text. (Right-clicks still reach the mark —
  // resolved by geometry — as 'context menu recolours and removes a mark' proves
  // via a real coordinate right-click.)
  const pe = await mark(page).evaluate((el) => getComputedStyle(el).pointerEvents);
  expect(pe).toBe('none');

  // Re-selecting the highlighted text still summons the strip, so it can be
  // recoloured in place.
  await select(page);
  await expect(strip(page)).toBeVisible();
  await page.keyboard.press('Escape');
});

test('recolouring the middle of a highlight splits it and keeps the ends', async ({ page }) => {
  // Yellow over the whole line.
  await select(page);
  await page.getByTestId('strip-color-yellow').click();
  await expect(mark(page)).toHaveCount(1);
  await expect(strip(page)).toHaveCount(0);

  // Green over just the middle word "ipsum" (chars 6..11 of the line).
  await page.evaluate(() => {
    const span = document.querySelector('.textLayer span');
    const node = span?.firstChild;
    if (!node) throw new Error('no text node to sub-select');
    const range = document.createRange();
    range.setStart(node, 6);
    range.setEnd(node, 11);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    span?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await page.getByTestId('strip-color-green').click();

  // Preview-style: the middle becomes green, the surrounding text stays yellow —
  // the yellow highlight is not wiped, it is split into a left and right strip.
  await expect(mark(page)).toHaveCount(2);
  await expect(page.locator('[data-testid="pdf-highlight-mark"][data-color="green"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="pdf-highlight-mark"][data-color="yellow"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="pdf-highlight-layer"] span.bg-hl-yellow')).toHaveCount(2);
  await expect(page.locator('[data-testid="pdf-highlight-layer"] span.bg-hl-green')).toHaveCount(1);
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
