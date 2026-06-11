import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('sidebar reflects the brain-space note count and cancels add-doc on Escape', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await page.goto(`/#/s/${spaceId}/dump`);
  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(
    page.getByTestId('brain-canvas-content').locator(':scope > [data-testid^="brain-note-"]'),
  ).toHaveCount(1);

  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  await expect(page.getByTestId('sidebar-brain-space-link-count')).toContainText(
    '◦',
  );

  const sidebar = page.locator('aside').last();
  await sidebar.getByRole('button', { name: /Add doc to/ }).first().click();
  const addInput = sidebar.getByPlaceholder(/Doc name/i);
  await expect(addInput).toBeVisible();
  await addInput.press('Escape');
  await expect(addInput).toHaveCount(0);
});
