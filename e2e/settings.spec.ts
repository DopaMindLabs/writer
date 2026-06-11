import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('Settings screen is reachable from home and renders the Editor tab by default', async ({ page }) => {
  await page.goto('/#/settings');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('button', { name: /^Editor$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Appearance$/ })).toBeVisible();
});

test('switching to the Appearance tab renders its placeholder heading', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('button', { name: /^Appearance$/ }).click();
  await expect(
    page.getByRole('heading', { name: /^Appearance$/ }),
  ).toBeVisible();
});

test('Account tab shows the coming-soon placeholder', async ({ page }) => {
  await page.goto('/#/settings?tab=account');
  await expect(page.getByRole('heading', { name: /Account/i })).toBeVisible();
  await expect(page.getByText(/Cloud sync is not available/i)).toBeVisible();
});

test('stacks a group on one page and scrolls to the selected section', async ({
  page,
}) => {
  await page.goto('/#/settings');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: /^General$/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Editor$/ })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /^Typography$/ }),
  ).toBeVisible();

  await page.getByTestId('settings-tab-shortcuts').click();
  await expect(
    page.getByRole('heading', { name: /^Shortcuts$/ }),
  ).toBeInViewport();

  await page.getByTestId('settings-tab-account').click();
  await expect(page.getByRole('heading', { name: /^Account$/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Editor$/ })).toHaveCount(0);
});

test('cycles through every global settings tab without crashing', async ({ page }) => {
  await page.goto('/#/settings');
  await page.waitForLoadState('networkidle');
  const tabs: { id: string; heading: RegExp }[] = [
    { id: 'general', heading: /^General$/i },
    { id: 'appearance', heading: /^Appearance$/i },
    { id: 'typography', heading: /^Typography$/i },
    { id: 'editor', heading: /^Editor$/i },
    { id: 'shortcuts', heading: /^Shortcuts$/i },
    { id: 'palettes', heading: /^Highlight palettes$/i },
    { id: 'citations', heading: /^Citation style$/i },
    { id: 'annotation', heading: /^Annotations$/i },
    { id: 'backups', heading: /^Backups$/i },
    { id: 'export', heading: /^Export \/ import$/i },
    { id: 'data', heading: /^Your data$/i },
    { id: 'account', heading: /^Account$/i },
    { id: 'about', heading: /^About$/i },
  ];
  for (const { id, heading } of tabs) {
    await page.getByTestId(`settings-tab-${id}`).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});
