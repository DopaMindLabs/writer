/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';
import { validateWriterPreviewOrigin } from './scripts/preview-origin.mjs';
import { PREVIEW_STORAGE_STATE } from './playwright.preview.setup';

// Every spec run under this config targets a live deployment rather than the
// local Vite preview, so the shared `failOnCspViolation` fixture in
// e2e/_helpers.ts asserts the deployed CSP never blocks anything — the one
// class of bug vercel.json's headers can produce that a local Playwright
// preview cannot reproduce (it applies no such header at all).
process.env.E2E_ASSERT_NO_CSP_VIOLATIONS = '1';

// Validate the target up front (also validated in global setup before the secret
// is used): only the Writer production/preview origins are accepted, never an
// arbitrary host. Throws with a clear message when unset or disallowed.
const baseURL = validateWriterPreviewOrigin(process.env.E2E_BASE_URL ?? '');

export default defineConfig({
  testDir: './e2e',
  // The deployment build uses the browser router and disables the ?reseed
  // affordance, so the local suite's hash-route, seed-dependent specs cannot
  // run against it. Only the purpose-built preview smoke does — it drives
  // first-run, data-independent surfaces and asserts the deployed CSP.
  testMatch: ['**/preview-smoke.spec.ts'],
  // Scope the Vercel bypass secret to a single validated-origin request that
  // yields an origin-scoped cookie; the browser context then carries only that
  // cookie, never the secret header on every request. Removed on teardown.
  globalSetup: './playwright.preview.setup.ts',
  globalTeardown: './playwright.preview.teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    process.env.CI ? ['github'] : ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL,
    storageState: PREVIEW_STORAGE_STATE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
