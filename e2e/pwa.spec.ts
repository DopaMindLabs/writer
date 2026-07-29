import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

test('the page links a fetchable web app manifest', async ({ page }) => {
  await reseedAndGoHome(page);
  const link = page.locator('head link[rel="manifest"]');
  await expect(link).toHaveAttribute('href', /manifest\.webmanifest/);
  const href = await link.getAttribute('href');
  const response = await page.request.get(href ?? '');
  expect(response.status()).toBe(200);
  const manifest = (await response.json()) as {
    name: string;
    display: string;
    icons: { purpose?: string }[];
  };
  expect(manifest.name).toBe('LIpsum Writer');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
});

test('the service worker activates and the app shell survives offline reloads', async ({
  page,
  context,
}) => {
  await reseedAndGoHome(page);
  await expect(page.getByRole('link', { name: /Continue writing/i })).toBeVisible();

  // `ready` resolves after activation, which the install (precache) phase
  // strictly precedes — once it settles the full shell is cached.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.reload();
  // The shell and the writer's data (IndexedDB) are both served locally.
  await expect(page.getByRole('link', { name: /Continue writing/i })).toBeVisible();
  await context.setOffline(false);
});

test('settings reports how durably the browser holds local data', async ({ page }) => {
  await reseedAndGoHome(page);
  await page.goto('/#/settings?tab=export');
  const row = page.getByTestId('settings-storage-protection');
  await expect(row).toBeVisible();
  await expect(row).toContainText(/storage protection/i);
  // Headless Chromium answers the persistence query either way; the row must
  // settle on a real state, never the loading placeholder.
  await expect(row.getByText(/protected|best effort|not supported/i)).toBeVisible();
});
