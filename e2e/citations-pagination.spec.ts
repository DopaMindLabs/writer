import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

const makeBib = (count: number): string =>
  Array.from(
    { length: count },
    (_, i) =>
      `@article{pg${String(i).padStart(3, '0')}, author = {Auth${String(i)}}, title = {Title ${String(i)}}, year = {${2000 + i}}}`,
  ).join('\n');

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const addManyCitations = async (page: Page, count: number) => {
  await page.getByTestId('citations-add-toggle').click();
  await page.getByTestId('citations-manual-add-input').fill(makeBib(count));
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(page.getByTestId('citations-status')).toContainText(
    /imported \d+ citations/i,
  );
};

test('pagination appears when citations exceed page size and navigates between pages', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await addManyCitations(page, 30);

  await expect(page.getByTestId('citations-page-indicator')).toHaveText('1/2');
  await expect(page.getByTestId('citations-prev-page')).toBeDisabled();
  await expect(page.getByTestId('citations-next-page')).toBeEnabled();

  await page.getByTestId('citations-next-page').click();
  await expect(page.getByTestId('citations-page-indicator')).toHaveText('2/2');
  await expect(page.getByTestId('citations-next-page')).toBeDisabled();
  await expect(page.getByTestId('citations-prev-page')).toBeEnabled();

  await page.getByTestId('citations-prev-page').click();
  await expect(page.getByTestId('citations-page-indicator')).toHaveText('1/2');
});

test('search resets pagination to page 1', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await addManyCitations(page, 30);

  await page.getByTestId('citations-next-page').click();
  await expect(page.getByTestId('citations-page-indicator')).toHaveText('2/2');

  await page.getByTestId('citations-search').fill('pg000');
  await expect(page.getByTestId('citations-page-indicator')).toHaveCount(0);
  await expect(page.getByText('pg000').first()).toBeVisible();
});

test('select-all only selects citations on the current page', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await addManyCitations(page, 30);

  await page.getByTestId('citations-select-all').click();
  const bulkBar = page.getByTestId('citations-bulk-bar');
  await expect(bulkBar).toContainText(/25 selected/i);
});

test('copy tag button copies the citation key to clipboard', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await page.getByTestId('citations-add-toggle').click();
  await page.getByTestId('citations-manual-add-input').fill(
    '@article{copyTag01, author = {A}, title = {T}, year = {2020}}',
  );
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(page.getByText('copyTag01').first()).toBeVisible();

  await page.getByRole('button', { name: /view citation copyTag01/i }).click();
  const detail = page.locator('[data-testid^="citation-detail-"]').first();
  await expect(detail).toBeVisible();

  await detail.locator('[data-testid$="-copy"]').click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toBe('copyTag01');
});
