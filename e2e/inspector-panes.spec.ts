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
