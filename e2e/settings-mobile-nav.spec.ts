import { test, expect } from './_helpers';
import { reseedAndGoHome, gotoFirstDoc } from './_helpers';

test.use({ viewport: { width: 390, height: 844 } });

test('universal settings keeps its header and tab strip in view when opened from the more sheet', async ({
  page,
}) => {
  await reseedAndGoHome(page);
  await gotoFirstDoc(page);

  await page.getByTestId('mobile-tabs-more').click();
  await page.getByRole('link', { name: /universal settings/i }).click();
  await page.waitForURL(/settings/);

  // Let the section-stack's programmatic scroll (if any) settle, then make
  // sure it only moved the settings pane — not the window past the nav.
  await page.waitForTimeout(800);
  const strip = page.getByTestId('settings-tabs-mobile');
  await expect(strip).toBeVisible();
  const box = await strip.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  // The shell header above the strip is visible too.
  await expect(page.getByText('UNIVERSAL SETTINGS').first()).toBeVisible();
});
