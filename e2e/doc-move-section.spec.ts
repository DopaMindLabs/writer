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

test.describe('Workflow: filing a document by keyboard', () => {
  test('open the row menu, pick a section with the arrows, and confirm the move', async ({
    page,
  }) => {
    let docId = '';
    let target = '';

    await test.step('Given a fiction space with its seeded Manuscript doc', async () => {
      await createSpaceFromTemplate(page, 'fiction');
      docId = await firstDocId(page);
      await expect(
        sectionByLabel(page, 'Manuscript').locator(
          `[data-testid="sidebar-doc-${docId}"]`,
        ),
      ).toBeVisible();
    });

    await test.step('When they open the move list from the row menu', async () => {
      await openMoveList(page, docId);
      await page.getByTestId(`sidebar-doc-${docId}-move-list-search`).focus();
    });

    await test.step('And they walk the list with the arrow keys', async () => {
      const search = page.getByTestId(`sidebar-doc-${docId}-move-list-search`);
      // Down twice then up once settles on the second row, proving the active
      // index moves both ways rather than only forward.
      await search.press('ArrowDown');
      await search.press('ArrowDown');
      await search.press('ArrowUp');
      target = String(await page.getByRole('option').nth(1).textContent()).trim();
      expect(target).toBeTruthy();
      await search.press('Enter');
    });

    await test.step('Then the document is filed under that section', async () => {
      await expect(
        sectionByLabel(page, target).locator(
          `[data-testid="sidebar-doc-${docId}"]`,
        ),
      ).toBeVisible();
    });

    await test.step('And Escape closes the list when they change their mind', async () => {
      await openMoveList(page, docId);
      const search = page.getByTestId(`sidebar-doc-${docId}-move-list-search`);
      await search.focus();
      // Escape is left to bubble so the surrounding menu closes with it.
      await search.press('Escape');
      await expect(search).toBeHidden();
    });
  });
});
