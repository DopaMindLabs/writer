import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const gotoFirstDoc = async (page: Page): Promise<void> => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
};

test('inspector expands and switches between every section pane', async ({
  page,
}) => {
  await gotoFirstDoc(page);
  await page.getByRole('button', { name: /doc inspector/i }).click();

  const rail = page.getByTestId('doc-inspector-icons');
  await expect(rail).toBeVisible();
  await rail.getByTestId('doc-inspector-icons-outline').click();
  await expect(rail).toBeHidden();

  const inspector = page.getByTestId('doc-inspector');
  await expect(inspector).toBeVisible();
  for (const id of ['info', 'history', 'actions', 'outline']) {
    await inspector.getByTestId(`doc-inspector-tab-${id}`).click();
    await expect(page.getByTestId(`doc-inspector-pane-${id}`)).toBeVisible();
  }

  await inspector.getByTestId('doc-inspector-collapse').click();
  await expect(inspector).toBeHidden();
});

test('outline pane lists the document headings as they are written', async ({
  page,
}) => {
  await gotoFirstDoc(page);

  await page.getByRole('button', { name: /doc inspector/i }).click();
  await page.getByTestId('doc-inspector-icons-outline').click();

  const pane = page.getByTestId('doc-inspector-pane-outline');
  await expect(pane).toBeVisible();
  await expect(pane.getByTestId('outline-empty')).toBeVisible();
  await expect(pane).toContainText('0 SECTIONS');

  const body = page.getByLabel('Document body');
  await body.click();
  await body.pressSequentially(
    '# The tower\nMorning prose under the heading.\n## Counting\nMore prose.',
    { delay: 0 },
  );

  const rows = pane.getByTestId('outline-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('The tower');
  await expect(rows.nth(0)).toHaveAttribute('data-level', '1');
  await expect(rows.nth(1)).toContainText('Counting');
  await expect(rows.nth(1)).toHaveAttribute('data-level', '2');
  await expect(pane).toContainText('2 SECTIONS');
  await expect(pane).not.toContainText('Morning prose');
  await expect(pane.getByTestId('outline-empty')).toBeHidden();
});
