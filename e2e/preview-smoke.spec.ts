import { test, expect } from './_helpers';

/**
 * Runs ONLY under `playwright.preview.config.ts`, against a live Vercel
 * deployment. Its job is the one thing the local suite structurally cannot do:
 * exercise the deployed artifact's real `vercel.json` CSP (the local Vite
 * preview applies no such header). The `failOnCspViolation` fixture — active
 * whenever `E2E_ASSERT_NO_CSP_VIOLATIONS=1`, which this config sets — fails the
 * test on any browser CSP error.
 *
 * The deployment build uses the browser router (`/settings`, not `/#/settings`)
 * and disables the `?reseed` affordance, so these specs drive only first-run,
 * data-independent surfaces — never the local suite's hash routes or seeded
 * fixtures.
 */
test.describe('deployed preview smoke', () => {
  test('boots and renders the app shell without a CSP violation', async ({ page }) => {
    await page.goto('/');
    // The shell rendering at all proves the base CSP (script-src 'self', the
    // style-src/font-src/img-src directives) does not block the bundle.
    await expect(page.getByRole('navigation', { name: /Primary/i })).toBeVisible();
  });

  test('activates cloud sync and reaches dexie.cloud without a CSP violation', async ({
    page,
  }) => {
    // ?cloud-sync=on plus the build-time VITE_DEXIE_CLOUD_URL reveal the cloud
    // section and let the addon open its sync fetch/websocket — exercising the
    // connect-src `https://…dexie.cloud`/`wss://…dexie.cloud` and worker-src
    // `blob:` relaxations. A misconfigured directive (e.g. an unreplaced <DB>
    // placeholder) surfaces here as a CSP console error the fixture catches.
    await page.goto('/?cloud-sync=on');
    await page.goto('/settings?tab=cloudSync');
    await expect(page.getByTestId('cloud-section')).toBeVisible();
  });
});
