import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('Settings screen is reachable from home and renders the Editor tab by default', async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: /Editor/i })).toBeVisible();
  await expect(page.getByText(/Floating toolbar/i)).toBeVisible();
});

test('switching to the Theme tab updates the theme', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('button', { name: /^Theme$/ }).click();
  await expect(page.getByRole('heading', { name: /^Theme$/ })).toBeVisible();
  await page.getByRole('button', { name: /^Dark$/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('Account tab shows the coming-soon placeholder', async ({ page }) => {
  await page.goto('/#/settings?tab=account');
  await expect(page.getByRole('heading', { name: /Account/i })).toBeVisible();
  await expect(page.getByText(/Cloud sync is unavailable/i)).toBeVisible();
});
