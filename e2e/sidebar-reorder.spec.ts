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
 * Press `handle`, travel past the mouse sensor's 8px activation distance, wait
 * for the drag to be picked up (a condition, not a timed wait — the
 * `data-dragging` marker), then drop it on `target`. Mouse drags activate on
 * movement, so a press alone must never become a drag — the initial nudge is
 * what starts it.
 */
const dragOnto = async (
  page: Page,
  handle: Locator,
  marker: Locator,
  target: Locator,
) => {
  const from = await handle.boundingBox();
  if (!from) throw new Error('missing handle box');
  const cx = from.x + from.width / 2;
  const cy = from.y + from.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  // Cross the activation distance so the sensor engages.
  await page.mouse.move(cx + 12, cy, { steps: 3 });
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

test('drops a document onto the emptied Workshop header', async ({ page }) => {
  const sidebar = page.locator('aside').last();
  const workshop = sectionWrappers(page).filter({
    has: page.locator('[data-testid$="-label"]', { hasText: 'Workshop' }),
  });
  const workshopDocs = workshop.locator(
    '[data-testid^="sidebar-doc-"][data-testid$="-sortable"]',
  );

  // Empty the Workshop: move its seeded doc out via the row menu.
  const seededLink = workshopDocs.first().locator('a[href*="/d/"]').first();
  const docId = String(await seededLink.getAttribute('data-testid')).replace(
    'sidebar-doc-',
    '',
  );
  await workshop.getByTestId(`sidebar-doc-${docId}-menu`).click();
  await page.getByTestId(`sidebar-doc-${docId}-move`).click();
  await page.getByTestId(`sidebar-doc-${docId}-move-list-search`).fill('rep');
  await page.getByRole('option', { name: 'Report' }).click();
  await expect(workshopDocs).toHaveCount(0);

  // The Workshop is never draggable, but it must remain a drop target: drag a
  // document from another section onto the now-empty Workshop's header.
  const sourceRow = sidebar
    .locator('[data-testid^="sidebar-doc-"][data-testid$="-sortable"]')
    .first();
  const movedName = await text(sourceRow.locator('[data-testid$="-name"]'));
  const workshopHeader = workshop.locator('[data-testid$="-header"]');
  await dragOnto(page, sourceRow, sourceRow, workshopHeader);

  await expect(
    workshop.locator('[data-testid$="-name"]', { hasText: movedName }),
  ).toBeVisible();
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
