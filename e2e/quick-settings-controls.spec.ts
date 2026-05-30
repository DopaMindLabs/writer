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

const openQuickSettings = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: /LIpsum Writer/i }).first().click();
  await expect(page.getByTestId('quick-settings-popover')).toBeVisible();
};

test('quick settings applies every theme option', async ({ page }) => {
  await gotoFirstDoc(page);
  await openQuickSettings(page);
  const popover = page.getByTestId('quick-settings-popover');
  for (const id of ['dark', 'hc-light', 'hc-dark', 'light']) {
    await popover.getByTestId(`quick-settings-theme-${id}`).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', id);
  }
});

test('quick settings applies every reading width', async ({ page }) => {
  await gotoFirstDoc(page);
  await openQuickSettings(page);
  const popover = page.getByTestId('quick-settings-popover');
  for (const w of ['m', 'l', 's']) {
    await popover.getByTestId(`quick-settings-width-${w}`).click();
    await expect(
      page.locator(`[data-reading-width="${w}"]`).first(),
    ).toBeVisible();
  }
});

test('quick settings toggles the floating toolbar switch', async ({ page }) => {
  await gotoFirstDoc(page);
  await openQuickSettings(page);
  const toggle = page.getByTestId('quick-settings-floating-toolbar-toggle');
  const before = await toggle.getAttribute('aria-checked');
  await toggle.click();
  await expect(toggle).not.toHaveAttribute('aria-checked', before ?? '');
});
