import { test, expect } from './_helpers';
import { reseedAndGoHome, gotoFirstDoc } from './_helpers';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const openInspectorInfo = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: /doc inspector/i }).click();
  await page.getByTestId('doc-inspector-icons-info').click();
  await expect(page.getByTestId('doc-inspector-info')).toBeVisible();
};

test('sets a word limit and shows the over-limit highlight overlay', async ({
  page,
}) => {
  await gotoFirstDoc(page);
  await openInspectorInfo(page);

  await page.getByTestId('inspector-wordLimit').fill('3');
  // The words row now reads "current / 3" and the editor mounts the overlay.
  await expect(page.getByTestId('doc-inspector-info')).toContainText('/ 3');
  await expect(page.getByTestId('limit-highlight-overlay')).toBeVisible();
});

test('locks and unlocks the document body via the status picker', async ({
  page,
}) => {
  await gotoFirstDoc(page);
  await openInspectorInfo(page);

  const body = page.getByLabel('Document body');
  await expect(body).toHaveAttribute('contenteditable', 'true');

  await page.getByTestId('inspector-status').selectOption('complete');
  const banner = page.getByTestId('doc-lock-banner');
  await expect(banner).toBeVisible();
  await expect(body).toHaveAttribute('contenteditable', 'false');

  await banner.getByRole('button', { name: /unlock to edit/i }).click();
  await expect(banner).toBeHidden();
  await expect(body).toHaveAttribute('contenteditable', 'true');
});

test('flags an overdue due date', async ({ page }) => {
  await gotoFirstDoc(page);
  await openInspectorInfo(page);

  const dueDate = page.getByTestId('inspector-due-date');
  await dueDate.fill('2020-01-01');
  await expect(dueDate).toHaveValue('2020-01-01');
  await expect(dueDate).toHaveAttribute('aria-invalid', 'true');
});
