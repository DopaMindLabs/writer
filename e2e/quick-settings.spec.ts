import { test, expect } from './_helpers';
import { reseedAndGoHome, gotoFirstDoc } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const openQuickSettings = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.getByRole('button', { name: /LIpsum Writer/i }).first().click();
  await expect(page.getByTestId('quick-settings-popover')).toBeVisible();
};

test('opens the quick settings popover from the rail trigger', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await openQuickSettings(page);
  await expect(page.getByText(/^quick settings$/i)).toBeVisible();
});

test('switches the theme to dark via a chip click', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await openQuickSettings(page);
  const popover = page.getByTestId('quick-settings-popover');
  await popover.getByRole('button', { name: /^dark$/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('toggling the focus switch adds and removes focus=1 from the URL', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await openQuickSettings(page);
  await page.getByRole('switch', { name: /focus mode/i }).click();
  await expect(page).toHaveURL(/focus=1/);
  // Trigger may have moved (FocusRail vs SpaceRail). Re-open and toggle off.
  await page.getByRole('button', { name: /LIpsum Writer/i }).first().click();
  await expect(page.getByTestId('quick-settings-popover')).toBeVisible();
  await page.getByRole('switch', { name: /focus mode/i }).click();
  await expect(page).not.toHaveURL(/focus=1/);
});

test('changes the reading width via an S chip click', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await openQuickSettings(page);
  const popover = page.getByTestId('quick-settings-popover');
  await popover.getByRole('button', { name: /^s$/i }).click();
  // WriteSurface stamps data-reading-width on its scroller.
  await expect(page.locator('[data-reading-width="s"]').first()).toBeVisible();
});

test('clicking a help-tour menu item dismisses the popover', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await openQuickSettings(page);
  // Pick any tour menu item (welcome is first).
  const popover = page.getByTestId('quick-settings-popover');
  const tourItem = popover
    .locator('button')
    .filter({ hasText: /welcome|writer|citations|brainspace/i })
    .first();
  await tourItem.click();
  // PopoverClose wraps each MenuItem, so the popover closes on click.
  await expect(page.getByTestId('quick-settings-popover')).toBeHidden();
});

test('jumps to the Accessibility settings tab from quick settings', async ({
  page,
}) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await openQuickSettings(page);
  await page.getByTestId('quick-settings-accessibility').click();
  await expect(page).toHaveURL(/#\/settings\?tab=accessibility/);
  await expect(
    page.getByRole('heading', { name: 'Accessibility', level: 1 }),
  ).toBeVisible();
});
