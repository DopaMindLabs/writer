import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

const TWO_ENTRIES = `@article{e2eAlpha2020,
  author = {Alpha, A.},
  title  = {Alpha Title},
  year   = {2020},
}
@article{e2eBeta2021,
  author = {Beta, B.},
  title  = {Beta Title},
  year   = {2021},
}`;

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('citations manual-add opens, cancels, and adds a plain-text reference', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await page.getByTestId('citations-add-toggle').click();
  await expect(page.getByTestId('citations-manual-add')).toBeVisible();
  await page.getByTestId('citations-manual-add-cancel').click();
  await expect(page.getByTestId('citations-manual-add')).toHaveCount(0);

  await page.getByTestId('citations-add-toggle').click();
  await page
    .getByTestId('citations-manual-add-input')
    .fill('A plain-text reference');
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(page.getByTestId('citations-status')).toContainText(
    /added 1 citation/i,
  );
});

test('citations import reports plural counts and skips duplicate keys', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await page.getByTestId('citations-add-toggle').click();
  await page.getByTestId('citations-manual-add-input').fill(TWO_ENTRIES);
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(page.getByTestId('citations-status')).toContainText(
    /imported 2 citations/i,
  );

  await page.getByTestId('citations-add-toggle').click();
  await page.getByTestId('citations-manual-add-input').fill(TWO_ENTRIES);
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(page.getByTestId('citations-status')).toContainText(
    /imported 0 citations, skipped 2/i,
  );
});
