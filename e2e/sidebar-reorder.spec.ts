import type { Locator } from '@playwright/test';
import { test, expect } from './_helpers';
import { reseedAndGoHome, createSpaceFromTemplate } from './_helpers';

// The Technical template seeds several sections and documents to reorder.
test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
  await createSpaceFromTemplate(page, 'technical');
});

const text = async (loc: Locator) => ((await loc.textContent()) ?? '').trim();

// A section header / document row is itself the drag surface: focus it and use
// the arrow keys (dnd-kit's keyboard sensor). Pointer drag is a press-and-hold,
// which a spec can't drive without a hard-coded wait, so keyboard covers it.
const keyboardMoveDown = async (page: import('@playwright/test').Page, surface: Locator) => {
  await surface.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
};

test('reorders top-level sections with the keyboard', async ({ page }) => {
  const sidebar = page.locator('aside').last();
  const labels = sidebar.locator(
    '[data-testid^="sidebar-section-"][data-testid$="-label"]',
  );
  const firstLabel = await text(labels.first());
  const secondLabel = await text(labels.nth(1));

  const firstHeader = sidebar
    .locator('[data-testid^="sidebar-section-"][data-testid$="-header"]')
    .first();
  await keyboardMoveDown(page, firstHeader);

  // The first two sections have swapped.
  await expect(labels.first()).toHaveText(secondLabel);
  await expect(labels.nth(1)).toHaveText(firstLabel);
});

test('reorders documents within a section with the keyboard', async ({
  page,
}) => {
  const sidebar = page.locator('aside').last();
  const names = sidebar.locator(
    '[data-testid^="sidebar-doc-"][data-testid$="-name"]',
  );
  const firstDoc = await text(names.first());
  const secondDoc = await text(names.nth(1));

  const firstRow = sidebar
    .locator('[data-testid^="sidebar-doc-"][data-testid$="-sortable"]')
    .first();
  await keyboardMoveDown(page, firstRow);

  await expect(names.first()).toHaveText(secondDoc);
  await expect(names.nth(1)).toHaveText(firstDoc);
});
