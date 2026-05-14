import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    process.env.CI ? ['github'] : ['list'],
    ['html', { open: 'never' }],
    [
      'monocart-reporter',
      {
        name: 'E2E coverage',
        outputFile: './e2e-coverage/index.html',
        coverage: {
          name: 'E2E coverage',
          // Only consider app source served from /src/* under the dev server.
          entryFilter: (entry: { url?: string }) =>
            !!entry.url && entry.url.includes('/src/'),
          // Mirror the unit-coverage `exclude` block in vite.config.ts.
          sourceFilter: (path: string) =>
            path.includes('/src/') &&
            !path.endsWith('.d.ts') &&
            !path.includes('/src/db/schema') &&
            !path.includes('/src/data/templates/types') &&
            !path.endsWith('/src/main.tsx') &&
            !path.includes('/src/editor/') &&
            !path.includes('/src/test/') &&
            !path.includes('.test.') &&
            !path.includes('__snapshots__'),
          outputDir: './e2e-coverage',
          reports: [
            ['v8'],
            ['console-summary'],
            ['lcov'],
          ],
          // Fail the run if these thresholds are not met.
          thresholds: {
            lines: 90,
            statements: 90,
            functions: 90,
            branches: 90,
          },
        },
      },
    ],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
