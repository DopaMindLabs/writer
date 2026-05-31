import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('opens the citations side panel from the Write topbar and closes it', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForLoadState('networkidle');

  // The Topbar exposes a citations button (icon + optional label) at the top
  // of the chrome. Pick the desktop variant in the header.
  const citationsBtn = page
    .getByRole('button', { name: /citations/i })
    .first();
  await expect(citationsBtn).toBeVisible();
  await citationsBtn.click();

  const panel = page.getByRole('complementary', { name: 'Citations' });
  await expect(panel).toBeVisible();

  await panel.getByRole('button', { name: /close citations/i }).click();
  await expect(panel).toBeHidden();
});

test.describe('mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('citations panel covers the full viewport on mobile', async ({ page }) => {
    const spaceId = await getFirstSpaceIdFromHome(page);
    await page.goto(`/#/s/${spaceId}`);
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('button', { name: /citations/i })
      .first()
      .click();

    const panel = page.getByRole('complementary', { name: 'Citations' });
    await expect(panel).toBeVisible();

    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(380);
    expect(box!.height).toBeGreaterThanOrEqual(700);

    await panel.getByRole('button', { name: /close citations/i }).click();
    await expect(panel).toBeHidden();
  });
});
