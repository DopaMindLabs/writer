import { test, expect, reseedAndGoHome, gotoFirstDoc } from './_helpers';

test.use({ viewport: { width: 390, height: 800 } });

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('opens the doc inspector from the mobile more sheet', async ({ page }) => {
  await gotoFirstDoc(page);

  const tabs = page.getByTestId('mobile-tabs');
  await tabs.getByRole('button', { name: /more/i }).click();
  const sheet = page.getByTestId('mobile-more-sheet');
  await expect(sheet).toBeVisible();

  // The duplicated mode chips are gone; modes live in the topbar.
  await expect(sheet.getByRole('link', { name: /^read$/i })).toHaveCount(0);

  await sheet.getByTestId('mobile-more-inspector').click();
  await expect(sheet).toBeHidden();

  const drawer = page.getByTestId('mobile-inspector-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByTestId('doc-inspector')).toBeVisible();

  // Escape dismisses the drawer.
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});
