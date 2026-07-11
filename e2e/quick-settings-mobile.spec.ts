import { test, expect } from './_helpers';
import { reseedAndGoHome, gotoFirstDoc } from './_helpers';

test.use({ viewport: { width: 390, height: 800 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const openMoreSheet = async (page: import('@playwright/test').Page) => {
  await page.getByTestId('mobile-tabs-more').click();
  await expect(page.getByTestId('mobile-more-sheet')).toBeVisible();
};

test('changes the theme from the more sheet and persists it across a reload', async ({
  page,
}) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await openMoreSheet(page);

  await page.getByTestId('quick-settings-theme-dark').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('changes the reading width from the more sheet', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await openMoreSheet(page);

  await page.getByTestId('quick-settings-width-s').click();
  await expect(page.locator('[data-reading-width="s"]')).toBeVisible();
});

test('enters focus mode from the more sheet', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await openMoreSheet(page);

  await page.getByTestId('quick-settings-focus-toggle').click();
  await expect(page).toHaveURL(/focus=1/);
  // Focus mode hides the bottom tab bar; exiting focus on mobile is exercised
  // via the nav drawer's Quick settings row (see mobile-nav.spec.ts).
});

test('toggles the floating toolbar from the more sheet', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await openMoreSheet(page);

  const toggle = page.getByTestId('quick-settings-floating-toolbar-toggle');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
});

test('scrolls the sheet so the app links below the controls stay reachable', async ({
  page,
}) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await openMoreSheet(page);

  // The controls push the App group below the fold on a phone; it must remain
  // reachable by scrolling inside the sheet.
  const contact = page.getByRole('link', { name: /contact/i });
  await contact.scrollIntoViewIfNeeded();
  await expect(contact).toBeVisible();
});
