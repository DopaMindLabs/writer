import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('citations manual-add opens, cancels, and adds a plain-text reference', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  // Open the form, then cancel it (covers the open + cancel branches).
  await page.getByTestId('citations-add-toggle').click();
  await expect(page.getByTestId('citations-manual-add')).toBeVisible();
  await page.getByTestId('citations-manual-add-cancel').click();
  await expect(page.getByTestId('citations-manual-add')).toHaveCount(0);

  // Re-open and add a plain-text (non-BibTeX) reference → the `misc` branch.
  await page.getByTestId('citations-add-toggle').click();
  await page
    .getByTestId('citations-manual-add-input')
    .fill('A plain-text reference');
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(page.getByTestId('citations-status')).toContainText(
    /added 1 citation/i,
  );
});
