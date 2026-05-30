import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('citations search filters then the clear button restores the list', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await page.getByTestId('citations-add-toggle').click();
  await page
    .getByTestId('citations-manual-add-input')
    .fill('@article{clr1, author = {A, B}, title = {Clr Title}, year = {2020}}');
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(page.getByText('clr1').first()).toBeVisible();

  await page.getByTestId('citations-search').fill('zzznomatch');
  await expect(page.getByText(/no rows match your search/i)).toBeVisible();

  await page.getByTestId('citations-search-clear').click();
  await expect(page.getByText('clr1').first()).toBeVisible();
});
