import type { Locator, Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { reseedAndGoHome, createSpaceFromTemplate } from './_helpers';

// The Technical template seeds several sections and documents to reorder.
test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
  await createSpaceFromTemplate(page, 'technical');
});

const text = async (loc: Locator) => ((await loc.textContent()) ?? '').trim();

/**
 * Drag `handle` and drop it over `target` using incremental pointer moves so the
 * dnd-kit PointerSensor (6px activation distance) engages.
 */
const dragOnto = async (page: Page, handle: Locator, target: Locator) => {
  const from = await handle.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('missing bounding box for drag');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // Nudge past the activation threshold, then travel to the target centre.
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 12, {
    steps: 6,
  });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
};

test('reorders top-level sections by dragging the grip', async ({ page }) => {
  const sidebar = page.locator('aside').last();
  const labels = sidebar.locator(
    '[data-testid^="sidebar-section-"][data-testid$="-label"]',
  );
  const firstLabel = await text(labels.first());
  const secondLabel = await text(labels.nth(1));

  const firstHandle = sidebar
    .locator('[data-testid^="sidebar-section-"][data-testid$="-drag"]')
    .first();
  const secondHeader = sidebar
    .locator('[data-testid^="sidebar-section-"][data-testid$="-header"]')
    .nth(1);
  await dragOnto(page, firstHandle, secondHeader);

  // The first two sections have swapped.
  await expect(labels.first()).toHaveText(secondLabel);
  await expect(labels.nth(1)).toHaveText(firstLabel);
});

test('reorders documents within a section by dragging the grip', async ({
  page,
}) => {
  const sidebar = page.locator('aside').last();
  const names = sidebar.locator(
    '[data-testid^="sidebar-doc-"][data-testid$="-name"]',
  );
  const firstDoc = await text(names.first());
  const secondDoc = await text(names.nth(1));

  const firstHandle = sidebar
    .locator('[data-testid^="sidebar-doc-"][data-testid$="-drag"]')
    .first();
  await dragOnto(page, firstHandle, names.nth(1));

  await expect(names.first()).toHaveText(secondDoc);
  await expect(names.nth(1)).toHaveText(firstDoc);
});
