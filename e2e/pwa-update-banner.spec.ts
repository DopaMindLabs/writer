import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

// The real trigger needs two successive production builds (a waiting service
// worker), which a headless run cannot stage; the `?pwa-update=1` boot param
// forces the update signal the same way `?cloud-mismatch=1` drives the cloud
// surfaces. Asserting both the present and absent states with the same locator
// keeps a broken signal from greening the negative test vacuously.

test('no update banner appears in the default experience', async ({ page }) => {
  await reseedAndGoHome(page);
  await expect(page.getByRole('link', { name: /Continue writing/i })).toBeVisible();
  await expect(page.getByTestId('pwa-update-banner')).toHaveCount(0);
});

test('a ready update announces itself and offers a reload', async ({ page }) => {
  await page.goto('/?reseed=1&pwa-update=1#/');
  const banner = page.getByTestId('pwa-update-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute('role', 'status');
  await expect(banner).toContainText(/new version is available/i);
  // The boot param is consumed and stripped; the hash route survives.
  await expect(page).toHaveURL(/#\/$/);
  expect(new URL(page.url()).searchParams.has('pwa-update')).toBe(false);

  // With no waiting worker the apply handle is a no-op; the action must still
  // be a real, keyboard-reachable button with an accessible name.
  const reload = banner.getByRole('button', { name: /reload/i });
  await reload.focus();
  await expect(reload).toBeFocused();
  await reload.click();
  await expect(banner).toBeVisible();
});

test('the banner rides above every route, not just home', async ({ page }) => {
  await page.goto('/?reseed=1&pwa-update=1#/settings');
  await expect(page.getByTestId('pwa-update-banner')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Editor$/ })).toBeVisible();
});
