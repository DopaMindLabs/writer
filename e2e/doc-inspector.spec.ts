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

const LONG_PARAGRAPH =
  'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod ' +
  'tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam ' +
  'quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo ' +
  'consequat duis aute irure dolor in reprehenderit in voluptate velit esse.';

test('sets a word limit and shows the over-limit highlight overlay', async ({
  page,
}) => {
  await gotoFirstDoc(page);

  const body = page.getByLabel('Document body');
  await body.click();
  await body.pressSequentially(LONG_PARAGRAPH, { delay: 0 });

  await openInspectorInfo(page);
  await page.getByTestId('inspector-wordLimit').fill('3');
  await expect(page.getByTestId('doc-inspector-info')).toContainText('/ 3');

  const overlay = page.getByTestId('limit-highlight-overlay');
  await expect(overlay).toBeVisible();
  const zIndex = await overlay.evaluate(
    (el) => window.getComputedStyle(el).zIndex,
  );
  expect(zIndex === 'auto' || Number(zIndex) >= 0).toBe(true);

  await expect(overlay.locator('div').first()).toBeVisible();
  const widths = await overlay
    .locator('div')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
  const bodyWidth = await body.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  expect(Math.max(...widths)).toBeGreaterThan(bodyWidth * 0.6);
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

test('locks the Read surface for a doc whose status is a locked stage', async ({
  page,
}) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await openInspectorInfo(page);

  await page.getByTestId('inspector-status').selectOption('published');
  await expect(page.getByTestId('doc-lock-banner')).toBeVisible();

  await page.goto(`/#/s/${spaceId}/d/${docId}/read`);
  await expect(page.getByTestId('doc-lock-banner')).toBeVisible();
});

test('flags an overdue due date', async ({ page }) => {
  await gotoFirstDoc(page);
  await openInspectorInfo(page);

  const dueDate = page.getByTestId('inspector-due-date');
  await dueDate.fill('2020-01-01');
  await expect(dueDate).toHaveValue('2020-01-01');
  await expect(dueDate).toHaveAttribute('aria-invalid', 'true');
});
