import { test, expect } from './_helpers';
import { reseedAndGoHome, createSpaceFromTemplate } from './_helpers';
import type { Locator, Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const sidebarOf = (page: Page): Locator => page.locator('aside').last();

/** The section container (not its header) whose eyebrow label reads `label`. */
const sectionByLabel = (page: Page, label: string): Locator =>
  sidebarOf(page)
    .locator('[data-testid^="sidebar-section-"]')
    .filter({
      has: page.locator('[data-testid$="-label"]', { hasText: label }),
    });

const firstDocId = async (page: Page): Promise<string> => {
  const link = sidebarOf(page).locator('a[href*="/d/"]').first();
  const testId = await link.getAttribute('data-testid');
  expect(testId).toBeTruthy();
  return String(testId).replace('sidebar-doc-', '');
};

const openMoveList = async (page: Page, docId: string): Promise<void> => {
  await sidebarOf(page).getByTestId(`sidebar-doc-${docId}-menu`).click();
  await page.getByTestId(`sidebar-doc-${docId}-move`).click();
  await expect(page.getByTestId(`sidebar-doc-${docId}-move-list-search`)).toBeVisible();
};

test('moves a document to another section via the searchable row menu', async ({
  page,
}) => {
  await createSpaceFromTemplate(page, 'fiction');
  const docId = await firstDocId(page);

  // The first doc (Chapter 01) is seeded under "Manuscript".
  await expect(
    sectionByLabel(page, 'Manuscript').locator(`[data-testid="sidebar-doc-${docId}"]`),
  ).toBeVisible();

  await openMoveList(page, docId);
  // Narrow the list, then pick the target section.
  await page.getByTestId(`sidebar-doc-${docId}-move-list-search`).fill('wor');
  await page.getByRole('option', { name: 'World' }).click();

  // The row now lives under "World" and is gone from "Manuscript".
  await expect(
    sectionByLabel(page, 'World').locator(`[data-testid="sidebar-doc-${docId}"]`),
  ).toBeVisible();
  await expect(
    sectionByLabel(page, 'Manuscript').locator(`[data-testid="sidebar-doc-${docId}"]`),
  ).toHaveCount(0);
});

test('ticks the current section and shows an empty state for no matches', async ({
  page,
}) => {
  await createSpaceFromTemplate(page, 'fiction');
  const docId = await firstDocId(page);

  await openMoveList(page, docId);

  // The doc's own section (Manuscript) is the selected option.
  await expect(page.getByRole('option', { name: 'Manuscript' })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  // A query that matches nothing collapses to the empty message.
  await page.getByTestId(`sidebar-doc-${docId}-move-list-search`).fill('zzzzz');
  await expect(page.getByRole('option')).toHaveCount(0);
  await expect(page.getByText('No sections found')).toBeVisible();
});
