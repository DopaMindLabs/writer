import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { reseedAndGoHome, createSpaceFromTemplate } from './_helpers';

// The Technical template seeds Report / Data & figures / Code & math / Workshop,
// each with documents — a good fixture for section deletion.
test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
  await createSpaceFromTemplate(page, 'technical');
});

const sectionHeader = (page: Page, label: string) =>
  page
    .locator('aside')
    .last()
    .locator('[data-testid$="-header"]')
    .filter({ hasText: label })
    .first();

test('deletes a populated section after warning about its documents', async ({
  page,
}) => {
  const sidebar = page.locator('aside').last();
  const report = sectionHeader(page, 'Report');
  await expect(report).toBeVisible();

  await report.locator('[data-testid$="-menu"]').click();
  await page
    .locator('[data-testid^="sidebar-section-"][data-testid$="-delete"]')
    .click();

  // The confirmation names the documents that will be lost.
  const dialog = page.getByTestId('confirm-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/documents will be permanently deleted/);

  await page.getByTestId('confirm-dialog-confirm').click();

  await expect(
    sidebar.locator('[data-testid$="-header"]').filter({ hasText: 'Report' }),
  ).toHaveCount(0);
});

test('keeps the section when the delete is cancelled', async ({ page }) => {
  const sidebar = page.locator('aside').last();
  const data = sectionHeader(page, 'Data & figures');
  await data.locator('[data-testid$="-menu"]').click();
  await page
    .locator('[data-testid^="sidebar-section-"][data-testid$="-delete"]')
    .click();

  await expect(page.getByTestId('confirm-dialog')).toBeVisible();
  await page.getByTestId('confirm-dialog-cancel').click();

  await expect(page.getByTestId('confirm-dialog')).toHaveCount(0);
  await expect(
    sidebar
      .locator('[data-testid$="-header"]')
      .filter({ hasText: 'Data & figures' }),
  ).toBeVisible();
});

test('the Workshop section offers Add document but not Delete or Rename', async ({
  page,
}) => {
  const workshop = sectionHeader(page, 'Workshop');
  await expect(workshop).toBeVisible();
  await workshop.locator('[data-testid$="-menu"]').click();

  await expect(
    page.locator('[data-testid$="-add-doc"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-testid^="sidebar-section-"][data-testid$="-delete"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-testid^="sidebar-section-"][data-testid$="-rename"]'),
  ).toHaveCount(0);
});
