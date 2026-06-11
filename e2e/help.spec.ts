import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('reaches the Help Center from the primary navigation', async ({ page }) => {
  await page.getByRole('link', { name: /About/i }).first().click();
  await page.getByTestId('page-nav-nav-help').click();
  await expect(page).toHaveURL(/#\/help$/);
  await expect(page.getByRole('heading', { name: 'Help', level: 1 })).toBeVisible();
  await expect(page.getByTestId('help-landing')).toBeVisible();
});

test('loads with the Settings-style shell and navigates via the sub-nav', async ({
  page,
}) => {
  await page.goto('/#/help');
  await expect(page.getByText('Help / Documentation')).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Help topics' });
  await expect(nav).toBeVisible();
  const tab = page.getByTestId('settings-tab-keyboard-shortcuts').first();
  await tab.click();
  await expect(page).toHaveURL(/#\/help\/keyboard-shortcuts$/);
  await expect(
    page.getByRole('heading', { name: 'Keyboard shortcuts', level: 1 }),
  ).toBeVisible();
});

test('searches the Help Center and opens a result', async ({ page }) => {
  await page.goto('/#/help');
  await page.getByTestId('help-search').fill('bibtex');
  const result = page.getByTestId('help-results').getByRole('link', {
    name: /Citations & bibliography/,
  });
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/#\/help\/citations-and-bibliography$/);
  await expect(
    page.getByRole('heading', { name: 'Citations & bibliography', level: 1 }),
  ).toBeVisible();
});

test('browses to an article from a category card', async ({ page }) => {
  await page.goto('/#/help');
  await page.getByRole('link', { name: 'Keyboard shortcuts' }).first().click();
  await expect(page).toHaveURL(/#\/help\/keyboard-shortcuts$/);
  await expect(
    page.getByRole('heading', { name: 'Keyboard shortcuts', level: 1 }),
  ).toBeVisible();
});

test('jumps to the all-features catalogue from the landing', async ({ page }) => {
  await page.goto('/#/help');
  await page.getByTestId('help-all-features').click();
  await expect(page).toHaveURL(/#\/help\/features$/);
  await expect(page.getByTestId('help-article')).toBeVisible();
});

test('opens the Quick Help overlay with ⌘K and jumps to an article', async ({
  page,
}) => {
  await page.keyboard.press('ControlOrMeta+KeyK');
  const palette = page.getByTestId('help-palette');
  await expect(palette).toBeVisible();
  await expect(page.getByText('Keyboard shortcuts')).toBeVisible();

  await page.getByTestId('help-palette-search').fill('brainspace');
  await palette.getByRole('link', { name: /BrainSpace/ }).first().click();

  await expect(page).toHaveURL(/#\/help\/brainspace$/);
  await expect(palette).toBeHidden();
});

test('closes the Quick Help overlay with Escape', async ({ page }) => {
  await page.keyboard.press('ControlOrMeta+KeyK');
  await expect(page.getByTestId('help-palette')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('help-palette')).toBeHidden();
});
