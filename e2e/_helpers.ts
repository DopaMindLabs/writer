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

// Mirrors src/tours/storage.ts — keep the key/shape in sync if those change.
const TOURS_STORAGE_KEY = 'lipsum-tours';
const ALL_TOUR_IDS = ['welcome', 'writer', 'citations', 'brainspace'];

// Extended test that (a) suppresses the driver.js guided tours so their
// overlay doesn't intercept pointer events, and (b) auto-collects V8 JS
// coverage from Chromium and pushes it to monocart-reporter. Specs should
// import `test` from this module instead of `@playwright/test`.
export const test = base.extend<{ autoCoverage: void }>({
  autoCoverage: [
    async ({ page, browserName }, use) => {
      await page.addInitScript(
        ({ key, ids }) => {
          try {
            localStorage.setItem(key, JSON.stringify({ version: 1, completed: ids }));
          } catch {
            /* ignore quota / disabled storage */
          }
        },
        { key: TOURS_STORAGE_KEY, ids: ALL_TOUR_IDS },
      );

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
