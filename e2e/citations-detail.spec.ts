import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('citation row opens a detail view, toggles edit, and deletes', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await page.getByTestId('citations-add-toggle').click();
  await page.getByTestId('citations-manual-add-input').fill('@misc{cdel1, title = {Delete Me}}');
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(page.getByText('cdel1').first()).toBeVisible();

  await page.getByRole('button', { name: /view citation cdel1/i }).click();
  await expect(
    page.locator('[data-testid^="citation-detail-"]').first(),
  ).toBeVisible();

  await page
    .locator('[data-testid^="citation-detail-"][data-testid$="-edit"]')
    .click();
  await expect(
    page.locator('[data-testid^="citation-edit-"]').first(),
  ).toBeVisible();
  await page
    .locator('[data-testid^="citation-edit-"][data-testid$="-cancel"]')
    .click();

  page.once('dialog', (d) => void d.accept());
  await page
    .locator('[data-testid^="citation-detail-"][data-testid$="-delete"]')
    .click();
  await expect(page.getByText('cdel1')).toHaveCount(0);
});
