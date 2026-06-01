import { test, expect } from './_helpers';
import {
  reseedAndGoHome,
  getFirstSpaceIdFromHome,
  createSpaceFromTemplate,
} from './_helpers';
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

test('turning a limit feature off keeps the count but hides the limit suffix and input', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await page.goto('/#/settings?tab=docInspector');
  await page.getByTestId('toggle-wordLimit').click();
  await page.getByTestId('toggle-charLimit').click();

  await gotoFirstDocIn(page, spaceId);
  await openInspectorInfo(page);
  // Counts stay (just informational).
  await expect(page.getByTestId('inspector-row-words')).toBeVisible();
  await expect(page.getByTestId('inspector-row-characters')).toBeVisible();
  await expect(page.getByTestId('inspector-row-words')).not.toContainText('/');
  await expect(page.getByTestId('inspector-row-characters')).not.toContainText(
    '/',
  );
  // Limit input rows disappear.
  await expect(page.getByTestId('inspector-wordLimit')).toHaveCount(0);
  await expect(page.getByTestId('inspector-charLimit')).toHaveCount(0);
  // Updated and Section stay (they aren't toggleable features).
  await expect(page.getByTestId('inspector-row-updated')).toBeVisible();
  await expect(page.getByTestId('inspector-row-section')).toBeVisible();
});

test('the gating behaves the same way in a different template (serial)', async ({
  page,
}) => {
  // Reproduces the user-reported scenario: "Issue 01" in the Serial template.
  await page.goto('/#/settings?tab=docInspector');
  await page.getByTestId('toggle-dueDate').click();
  await page.getByTestId('toggle-wordLimit').click();

  const serialSpaceId = await createSpaceFromTemplate(page, 'serial');
  await page.goto(`/#/s/${serialSpaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  await openInspectorInfo(page);
  // The Serial seed doc has no meta values, so disabled features must stay hidden.
  await expect(page.getByTestId('inspector-row-words')).toBeVisible();
  await expect(page.getByTestId('inspector-row-words')).not.toContainText('/');
  await expect(page.getByTestId('inspector-wordLimit')).toHaveCount(0);
  await expect(page.getByTestId('inspector-due-date')).toHaveCount(0);
  await expect(page.getByTestId('inspector-row-dueDate')).toHaveCount(0);
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
