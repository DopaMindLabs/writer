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

test('the nav drawer lists spaces by name and closes when one is chosen', async ({
  page,
}) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await page.getByRole('button', { name: /open nav/i }).click();

  const drawer = page.locator('[role="dialog"]');
  await expect(drawer).toBeVisible();
  const spaceRow = drawer.getByTestId(`mobile-nav-space-${spaceId}`);
  await expect(spaceRow).toBeVisible();
  // The row carries the space name, not just the two-letter tag.
  await expect(spaceRow).toHaveText(/\w{3,}/);

  await spaceRow.click();
  await expect(drawer).toBeHidden();
});

test('hands off from the nav drawer to the more sheet and changes the theme', async ({
  page,
}) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await page.getByRole('button', { name: /open nav/i }).click();

  const drawer = page.getByRole('dialog', { name: 'Navigation' });
  await expect(drawer).toBeVisible();
  await drawer.getByTestId('mobile-nav-quick-settings').click();

  await expect(drawer).toBeHidden();
  await expect(page.getByTestId('mobile-more-sheet')).toBeVisible();
  await page.getByTestId('quick-settings-theme-dark').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('leaves focus mode via the nav drawer on mobile', async ({ page }) => {
  const { spaceId, docId } = await gotoFirstDoc(page);
  await page.goto(`/#/s/${spaceId}/d/${docId}`);
  await openMoreSheet(page);
  await page.getByTestId('quick-settings-focus-toggle').click();
  await expect(page).toHaveURL(/focus=1/);

  // Dismiss the sheet; focus mode stays on and the bottom tabs are now gone.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('mobile-more-sheet')).toBeHidden();

  // The nav drawer's Quick settings row reopens the sheet so focus can be
  // switched back off.
  await page.getByRole('button', { name: /open nav/i }).click();
  await page
    .getByRole('dialog', { name: 'Navigation' })
    .getByTestId('mobile-nav-quick-settings')
    .click();
  await expect(page.getByTestId('mobile-more-sheet')).toBeVisible();
  await page.getByTestId('quick-settings-focus-toggle').click();
  await expect(page).not.toHaveURL(/focus=1/);
});
