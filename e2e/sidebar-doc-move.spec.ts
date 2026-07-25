import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { reseedAndGoHome, createSpaceFromTemplate } from './_helpers';

// The Technical template seeds several top-level sections, so a document always
// has somewhere else to move to.
test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
  await createSpaceFromTemplate(page, 'technical');
});

/** Read the id of the first document row from its menu-trigger testid. */
const firstDocId = async (page: Page): Promise<string> => {
  const trigger = page
    .locator('aside')
    .last()
    .locator('[data-testid^="sidebar-doc-"][data-testid$="-menu"]')
    .first();
  const testId = await trigger.getAttribute('data-testid');
  if (!testId) throw new Error('no doc row menu found');
  return testId.slice('sidebar-doc-'.length, -'-menu'.length);
};

/** Hover the row to reveal its menu trigger, then open the menu. */
const openRowMenu = async (page: Page, docId: string): Promise<void> => {
  const sidebar = page.locator('aside').last();
  await sidebar.getByTestId(`sidebar-doc-${docId}`).hover();
  await sidebar.getByTestId(`sidebar-doc-${docId}-menu`).click();
};

test('the row menu offers Move to', async ({ page }) => {
  const docId = await firstDocId(page);
  await openRowMenu(page, docId);

  const moveTo = page.getByTestId(`sidebar-doc-${docId}-move`);
  await expect(moveTo).toBeVisible();
  await expect(moveTo).toHaveAttribute('aria-haspopup', 'menu');
});

test('moves a document to another section from the row menu', async ({
  page,
}) => {
  const sidebar = page.locator('aside').last();
  const docId = await firstDocId(page);
  await openRowMenu(page, docId);

  // Open the Move-to submenu and take its first target section.
  await page.getByTestId(`sidebar-doc-${docId}-move`).hover();
  const target = page
    .locator(`[data-testid^="sidebar-doc-${docId}-move-"]`)
    .first();
  const targetTestId = await target.getAttribute('data-testid');
  if (!targetTestId) throw new Error('no move target found');
  const sectionId = targetTestId.slice(`sidebar-doc-${docId}-move-`.length);

  await target.click();

  // The document now renders inside the chosen section's container.
  await expect(
    sidebar
      .getByTestId(`sidebar-section-${sectionId}`)
      .getByTestId(`sidebar-doc-${docId}-name`),
  ).toBeVisible();
});
