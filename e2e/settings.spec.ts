import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('Settings screen is reachable from home and renders the Editor tab by default', async ({ page }) => {
  await page.goto('/#/settings');
  await page.waitForLoadState('networkidle');
  // Settings tabs render Editor/Appearance/Account/etc. as buttons.
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
  // Account placeholder surfaces the sync hint copy from settings.account.signedOutHint.
  await expect(page.getByText(/Cloud sync is not available/i)).toBeVisible();
});

test('cycles through every global settings tab without crashing', async ({ page }) => {
  await page.goto('/#/settings');
  await page.waitForLoadState('networkidle');
  // The full tab list maps 1:1 to TAB_IDS in Settings.tsx. Visiting each one
  // exercises the per-tab placeholder body, which boosts e2e line coverage on
  // the placeholder module.
  const tabs: Array<{ id: string; heading: RegExp }> = [
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
