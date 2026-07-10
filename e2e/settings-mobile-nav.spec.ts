import { test, expect } from './_helpers';
import {
  reseedAndGoHome,
  gotoFirstDoc,
  getFirstSpaceIdFromHome,
} from './_helpers';

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

test('the universal settings wordmark badge returns to the home page on mobile', async ({
  page,
}) => {
  await reseedAndGoHome(page);
  await page.goto('/#/settings');
  await page.waitForURL(/#\/settings/);

  // On mobile the SpaceRail (and its home link) is hidden, so the shell-header
  // badge is the only "back to home" affordance.
  const badge = page.getByTestId('nav-shell-home');
  await expect(badge).toHaveAccessibleName('Home');
  await badge.click();

  await page.waitForURL(/#\/$/);
  await expect(
    page.getByRole('link', { name: /Continue writing/i }),
  ).toBeVisible();
});

test('the space settings badge returns to the space on mobile', async ({
  page,
}) => {
  await reseedAndGoHome(page);
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings`);
  await page.waitForURL(/#\/s\/[^/]+\/settings/);

  const badge = page.getByTestId('nav-shell-home');
  await expect(badge).toHaveAccessibleName(/^Open /);
  await badge.click();

  // spaceWrite redirects to the first doc once Dexie loads; either way we have
  // left settings and are back inside the space.
  await page.waitForURL(new RegExp(`#/s/${spaceId}(/d/[^/?]+)?$`));
  expect(page.url()).toContain(`/s/${spaceId}`);
  expect(page.url()).not.toContain('/settings');
});
