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

const setToggle = async (
  page: Page,
  label: string,
  state: 'on' | 'off' | 'inherit',
): Promise<void> => {
  await page
    .getByRole('group', { name: label, exact: true })
    .getByTestId(`inspector-toggle-${state}`)
    .click();
};

test('global tab toggles a feature off, hiding it in the inspector', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await page.goto('/#/settings?tab=docInspector');
  await expect(page.getByTestId('settings-doc-inspector')).toBeVisible();
  const dueGroup = page.getByRole('group', { name: 'Due date', exact: true });
  await expect(dueGroup.getByTestId('inspector-toggle-on')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await setToggle(page, 'Due date', 'off');
  await expect(dueGroup.getByTestId('inspector-toggle-off')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

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
  await setToggle(page, 'Due date', 'off');

  await page.goto(`/#/s/${spaceId}/settings?tab=docInspector`);
  await expect(page.getByTestId('space-settings-doc-inspector')).toBeVisible();
  await setToggle(page, 'Due date', 'on');

  await gotoFirstDocIn(page, spaceId);
  await openInspectorInfo(page);
  await expect(page.getByTestId('inspector-due-date')).toBeVisible();
});

test('turning a limit feature off keeps the count but hides the limit suffix and input', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await page.goto('/#/settings?tab=docInspector');
  await setToggle(page, 'Word limit', 'off');
  await setToggle(page, 'Character limit', 'off');

  await gotoFirstDocIn(page, spaceId);
  await openInspectorInfo(page);
  await expect(page.getByTestId('inspector-row-words')).toBeVisible();
  await expect(page.getByTestId('inspector-row-characters')).toBeVisible();
  await expect(page.getByTestId('inspector-row-words')).not.toContainText('/');
  await expect(page.getByTestId('inspector-row-characters')).not.toContainText(
    '/',
  );
  await expect(page.getByTestId('inspector-wordLimit')).toHaveCount(0);
  await expect(page.getByTestId('inspector-charLimit')).toHaveCount(0);
  await expect(page.getByTestId('inspector-row-updated')).toBeVisible();
  await expect(page.getByTestId('inspector-row-section')).toBeVisible();
});

test('the space default chip explains it inherits from global settings', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings?tab=docInspector`);
  await expect(page.getByTestId('space-settings-doc-inspector')).toBeVisible();
  await page
    .getByRole('group', { name: 'Due date', exact: true })
    .getByTestId('inspector-toggle-inherit')
    .hover();
  await expect(
    page.getByTestId('inspector-toggle-inherit-tooltip'),
  ).toContainText(/inherited from global settings/i);
});

test('the gating behaves the same way in a different template (serial)', async ({
  page,
}) => {
  await page.goto('/#/settings?tab=docInspector');
  await setToggle(page, 'Due date', 'off');
  await setToggle(page, 'Word limit', 'off');

  const serialSpaceId = await createSpaceFromTemplate(page, 'serial');
  await page.goto(`/#/s/${serialSpaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  await openInspectorInfo(page);
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
