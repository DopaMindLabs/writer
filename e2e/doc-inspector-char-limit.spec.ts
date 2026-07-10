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

const SHORT_TEXT = 'Hello world this is a short test paragraph';

test('sets a character limit and shows the over-limit highlight overlay', async ({
  page,
}) => {
  await gotoFirstDoc(page);

  const body = page.getByTestId('document-body');
  await body.click();
  await body.pressSequentially(SHORT_TEXT, { delay: 0 });

  await openInspectorInfo(page);
  await page.getByTestId('inspector-charLimit').fill('5');
  await expect(page.getByTestId('doc-inspector-info')).toContainText('/ 5');

  const overlay = page.getByTestId('limit-highlight-overlay');
  await expect(overlay).toBeVisible();
});

test('char limit below total text triggers overlay while word limit does not if within range', async ({
  page,
}) => {
  await gotoFirstDoc(page);

  const body = page.getByTestId('document-body');
  await body.click();
  await body.pressSequentially('One two three four five', { delay: 0 });

  await openInspectorInfo(page);

  // Word limit within range => no overlay
  await page.getByTestId('inspector-wordLimit').fill('10');
  await expect(page.getByTestId('limit-highlight-overlay')).toHaveCount(0);

  // Char limit below total => overlay appears
  await page.getByTestId('inspector-charLimit').fill('10');
  await expect(page.getByTestId('limit-highlight-overlay')).toBeVisible();
});

test('removing the character limit hides the overlay', async ({ page }) => {
  await gotoFirstDoc(page);

  const body = page.getByTestId('document-body');
  await body.click();
  await body.pressSequentially('abcdefghij', { delay: 0 });

  await openInspectorInfo(page);
  await page.getByTestId('inspector-charLimit').fill('5');
  await expect(page.getByTestId('limit-highlight-overlay')).toBeVisible();

  await page.getByTestId('inspector-charLimit').fill('');
  await expect(page.getByTestId('limit-highlight-overlay')).toHaveCount(0);
});
