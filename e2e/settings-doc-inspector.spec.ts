import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const gotoFirstDocIn = async (page: Page, spaceId: string): Promise<void> => {
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
};

const openInspectorInfo = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: /doc inspector/i }).click();
  await page.getByTestId('doc-inspector-icons-info').click();
  await expect(page.getByTestId('doc-inspector-info')).toBeVisible();
};

test('global tab toggles a feature off, hiding it in the inspector', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await page.goto('/#/settings?tab=docInspector');
  await expect(page.getByTestId('settings-doc-inspector')).toBeVisible();
  const dueToggle = page.getByTestId('toggle-dueDate');
  await expect(dueToggle).toHaveAttribute('aria-checked', 'true');
  await dueToggle.click();
  await expect(dueToggle).toHaveAttribute('aria-checked', 'false');

  await gotoFirstDocIn(page, spaceId);
  await openInspectorInfo(page);
  await expect(page.getByTestId('inspector-status')).toBeVisible();
  await expect(page.getByTestId('inspector-due-date')).toHaveCount(0);
});

test('a space overrides a globally disabled feature back on', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await page.goto('/#/settings?tab=docInspector');
  await page.getByTestId('toggle-dueDate').click();

  await page.goto(`/#/s/${spaceId}/settings?tab=docInspector`);
  await expect(page.getByTestId('space-settings-doc-inspector')).toBeVisible();
  await page
    .getByRole('group', { name: 'Due date' })
    .getByTestId('inspector-toggle-on')
    .click();

  await gotoFirstDocIn(page, spaceId);
  await openInspectorInfo(page);
  await expect(page.getByTestId('inspector-due-date')).toBeVisible();
});

test('hides a status stage disabled in settings', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await page.goto('/#/settings?tab=docInspector');
  await page.getByTestId('stage-in-review').click();
  await expect(page.getByTestId('stage-in-review')).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  await gotoFirstDocIn(page, spaceId);
  await openInspectorInfo(page);
  const options = page.getByTestId('inspector-status').locator('option');
  await expect(options.filter({ hasText: 'In review' })).toHaveCount(0);
  await expect(options.filter({ hasText: 'Draft' })).toHaveCount(1);
});
