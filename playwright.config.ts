/// <reference types="node" />
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
          // Accept every JS asset the preview server serves (we filter to
          // app source via sourceFilter once monocart applies source maps).
          entryFilter: (entry: { url?: string }) => {
            if (!entry.url) return false;
            return (
              entry.url.includes('localhost') &&
              (entry.url.includes('/assets/') ||
                entry.url.includes('/src/'))
            );
          },
          // After source-mapping, monocart hands us source paths from the
          // emitted source map. Vite emits relative paths like
          // `../../src/components/Topbar.tsx`, so match `src/` (no leading
          // slash) but exclude `node_modules/`.
          sourceFilter: (path: string) => {
            if (path.includes('node_modules/')) return false;
            if (!/(^|\/)src\//.test(path)) return false;
            if (path.endsWith('.d.ts')) return false;
            if (path.endsWith('.json')) return false;
            if (path.endsWith('.css')) return false;
            if (path.includes('src/db/schema')) return false;
            if (path.includes('src/data/templates/types')) return false;
            if (/(^|\/)src\/main\.tsx$/.test(path)) return false;
            if (path.includes('src/editor/')) return false;
            if (path.includes('src/test/')) return false;
            // Tours are suppressed in e2e via the localStorage init-script
            // in e2e/_helpers.ts (so the driver.js overlay doesn't intercept
            // pointer events), so they can't contribute to e2e coverage.
            // Cover them via unit tests instead.
            if (path.includes('src/tours/')) return false;
            if (path.includes('.test.')) return false;
            if (path.includes('__snapshots__')) return false;
            return true;
          },
          outputDir: './e2e-coverage',
          reports: [
            ['v8'],
            ['console-summary'],
            ['lcov'],
          ],
          onEnd: async (reportData: {
            summary?: Record<string, { pct?: number }>;
          }) => {
            const s = reportData.summary ?? {};
            const metrics = ['lines', 'statements', 'functions', 'branches'];
            const summary: Record<string, { pct: number }> = {};
            for (const metric of metrics) {
              const pct = s[metric]?.pct;
              if (typeof pct === 'number') summary[metric] = { pct };
            }
            const { writeFile, mkdir } = await import('node:fs/promises');
            await mkdir('./e2e-coverage', { recursive: true });
            await writeFile(
              './e2e-coverage/coverage-summary.json',
              `${JSON.stringify(summary, null, 2)}\n`,
            );
          },
        },
      },
    ],
  ],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // E2E runs against a production preview build so monocart-reporter can
  // map V8 coverage back to original .tsx files via emitted source maps.
  // `npm run dev` works for ad-hoc debugging but yields broken coverage.
  webServer: {
    command: 'npm run build:e2e && npm run preview:e2e',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
