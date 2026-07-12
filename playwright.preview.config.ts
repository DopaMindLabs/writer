/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

// Every spec run under this config targets a live deployment rather than the
// local Vite preview, so the shared `failOnCspViolation` fixture in
// e2e/_helpers.ts asserts the deployed CSP never blocks anything — the one
// class of bug vercel.json's headers can produce that a local Playwright
// preview cannot reproduce (it applies no such header at all).
process.env.E2E_ASSERT_NO_CSP_VIOLATIONS = '1';

const baseURL = process.env.E2E_BASE_URL;
if (!baseURL) {
  throw new Error('E2E_BASE_URL is required to run e2e against a deployed preview');
}

// Set only when the target project has Deployment Protection enabled; see
// https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: './e2e',
  // The deployment build uses the browser router and disables the ?reseed
  // affordance, so the local suite's hash-route, seed-dependent specs cannot
  // run against it. Only the purpose-built preview smoke does — it drives
  // first-run, data-independent surfaces and asserts the deployed CSP.
  testMatch: ['**/preview-smoke.spec.ts'],
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
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...(bypassSecret
      ? {
          extraHTTPHeaders: {
            'x-vercel-protection-bypass': bypassSecret,
            'x-vercel-set-bypass-cookie': 'true',
          },
        }
      : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
