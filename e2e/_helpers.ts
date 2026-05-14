import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';

/**
 * Navigate to the app with `?reseed=1`, which wipes IndexedDB and reseeds
 * the default Bioinformatics template before the router mounts. Waits for
 * the boot sequence to finish (i.e. the "Booting…" placeholder is gone).
 */
export async function reseedAndGoHome(page: Page): Promise<void> {
  await page.goto('/?reseed=1#/');
  await page.waitForFunction(() => !document.body.innerText.includes('Booting…'));
}

/**
 * Resolve the first space's UUID from the SpaceRail tag link tooltip target.
 * Used by tests that want to skip the home page and jump directly into a doc.
 */
export async function getFirstSpaceIdFromHome(page: Page): Promise<string> {
  const continueLink = page.getByRole('link', { name: /Continue writing/i });
  const href = await continueLink.getAttribute('href');
  if (!href) throw new Error('Expected "Continue writing" link to be present after reseed');
  const match = href.match(/\/s\/([^/?#]+)/);
  if (!match) throw new Error(`Could not parse spaceId from href: ${href}`);
  return match[1];
}

// Extended test that auto-collects V8 JS coverage from Chromium and pushes it
// to monocart-reporter's global coverage report. Specs should import `test`
// from this module instead of `@playwright/test` so coverage is gathered.
export const test = base.extend<{ autoCoverage: void }>({
  autoCoverage: [
    async ({ page, browserName }, use) => {
      const enabled = browserName === 'chromium';
      if (enabled) {
        await page.coverage.startJSCoverage({ resetOnNavigation: false });
      }
      await use();
      if (enabled) {
        const jsCoverage = await page.coverage.stopJSCoverage();
        await addCoverageReport(jsCoverage, test.info());
      }
    },
    { scope: 'test', auto: true },
  ],
});

export { expect };
