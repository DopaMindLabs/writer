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
 * Press-and-hold `handle`, wait for the drag to be picked up (a condition, not a
 * timed wait — the `data-dragging` marker), drop it on `target`. Pointer drag is
 * a hold, so keyboard/timeout-free driving needs this shape.
 */
const dragOnto = async (
  page: Page,
  handle: Locator,
  marker: Locator,
  target: Locator,
) => {
  const from = await handle.boundingBox();
  if (!from) throw new Error('missing handle box');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await expect(marker).toHaveAttribute('data-dragging', 'true');
  const to = await target.boundingBox();
  if (!to) throw new Error('missing target box');
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(marker).not.toHaveAttribute('data-dragging', 'true');
};

const sectionWrappers = (page: Page) =>
  page
    .locator('aside')
    .last()
    .locator('[data-testid^="sidebar-section-"][data-testid$="-sortable"]');

test('reorders top-level sections by dragging the header', async ({ page }) => {
  const sidebar = page.locator('aside').last();
  const labels = sidebar.locator(
    '[data-testid^="sidebar-section-"][data-testid$="-label"]',
  );
  const firstLabel = await text(labels.first());
  const secondLabel = await text(labels.nth(1));

  const firstWrapper = sectionWrappers(page).first();
  const firstHeader = firstWrapper.locator('[data-testid$="-header"]');
  const secondHeader = sectionWrappers(page)
    .nth(1)
    .locator('[data-testid$="-header"]');
  await dragOnto(page, firstHeader, firstWrapper, secondHeader);

  await expect(labels.first()).toHaveText(secondLabel);
  await expect(labels.nth(1)).toHaveText(firstLabel);
});

test('reorders documents within a section by dragging', async ({ page }) => {
  const sidebar = page.locator('aside').last();
  const names = sidebar.locator(
    '[data-testid^="sidebar-doc-"][data-testid$="-name"]',
  );
  const firstDoc = await text(names.first());
  const secondDoc = await text(names.nth(1));

  const rows = sidebar.locator(
    '[data-testid^="sidebar-doc-"][data-testid$="-sortable"]',
  );
  await dragOnto(page, rows.first(), rows.first(), rows.nth(1));

  await expect(names.first()).toHaveText(secondDoc);
  await expect(names.nth(1)).toHaveText(firstDoc);
});

test('moves a document into another section by dragging', async ({ page }) => {
  const sidebar = page.locator('aside').last();
  const firstRow = sidebar
    .locator('[data-testid^="sidebar-doc-"][data-testid$="-sortable"]')
    .first();
  const movedName = await text(firstRow.locator('[data-testid$="-name"]'));

  const secondSection = sectionWrappers(page).nth(1);
  const secondHeader = secondSection.locator('[data-testid$="-header"]');
  await dragOnto(page, firstRow, firstRow, secondHeader);

  // The document now lives in the second section.
  await expect(
    secondSection.locator('[data-testid$="-name"]', { hasText: movedName }),
  ).toBeVisible();
});
