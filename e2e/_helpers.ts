import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';

/**
 * Navigate to the app with `?reseed=1`, which wipes IndexedDB and reseeds
 * the default Bioinformatics template before the router mounts. Waits for
 * the boot sequence to finish (i.e. the "Booting…" placeholder is gone).
 */
export const reseedAndGoHome = async (page: Page): Promise<void> => {
  await page.goto('/?reseed=1#/');
  await page.waitForFunction(() => !document.body.innerText.includes('Booting…'));
};

/**
 * Resolve the first space's UUID from the SpaceRail tag link tooltip target.
 * Used by tests that want to skip the home page and jump directly into a doc.
 */
export const getFirstSpaceIdFromHome = async (page: Page): Promise<string> => {
  const continueLink = page.getByRole('link', { name: /Continue writing/i });
  const href = await continueLink.getAttribute('href');
  if (!href) throw new Error('Expected "Continue writing" link to be present after reseed');
  const match = href.match(/\/s\/([^/?#]+)/);
  if (!match) throw new Error(`Could not parse spaceId from href: ${href}`);
  return match[1];
};

/**
 * Navigate to a freshly seeded space and return both its id and the first doc's
 * id. WriteScreen redirects `/s/:id` → `/s/:id/d/:firstDocId` once Dexie loads.
 */
export const gotoFirstDoc = async (
  page: Page,
): Promise<{ spaceId: string; docId: string }> => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const docId = new URL(page.url()).hash.match(/\/d\/([^/?]+)/)?.[1];
  if (!docId) throw new Error(`Could not extract docId from ${page.url()}`);
  return { spaceId, docId };
};

/**
 * Create a space from the given template via the Templates screen and return
 * the new space's UUID. Optionally override the template-prefilled name/tag.
 */
export const createSpaceFromTemplate = async (
  page: Page,
  templateId: string,
  opts?: { name?: string; tag?: string },
): Promise<string> => {
  await page.goto('/#/templates');
  await page.getByTestId(`templates-card-${templateId}`).click();
  if (opts?.name !== undefined) await page.locator('#space-name').fill(opts.name);
  if (opts?.tag !== undefined) await page.locator('#space-tag').fill(opts.tag);
  await page.getByTestId('templates-submit').click();
  await page.waitForURL(/#\/s\/[^/]+/);
  const spaceId = new URL(page.url()).hash.match(/\/s\/([^/?#]+)/)?.[1];
  if (!spaceId) throw new Error(`Could not extract spaceId from ${page.url()}`);
  return spaceId;
};

/**
 * Stub `window.showDirectoryPicker` so the File System Access folder-sync UI is
 * reachable in headless Chromium. Resolves a *method-free* handle: it is
 * structured-cloneable into IndexedDB (so `folderName` populates and the
 * connected UI renders) but lacks the directory/permission methods, so writes
 * fail — which exercises the sync error/results paths. Must run before
 * navigation (i.e. before `reseedAndGoHome`). Mirrors `sync-settings.spec.ts`.
 */
export const stubDirectoryPicker = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      writable: true,
      value: () => Promise.resolve({ name: 'Sync Folder', kind: 'directory' }),
    });
  });
};

// Mirrors src/tours/storage.ts — keep the key/shape in sync if those change.
const TOURS_STORAGE_KEY = 'lipsum-tours';
const ALL_TOUR_IDS = ['welcome', 'writer', 'citations', 'brainspace'];

// Extended test that (a) suppresses the driver.js guided tours so their
// overlay doesn't intercept pointer events, and (b) auto-collects V8 JS
// coverage from Chromium and pushes it to monocart-reporter. Specs should
// import `test` from this module instead of `@playwright/test`.
// nasa-exception: no-invalid-void-type (a Playwright fixture with no value is typed `void`)
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
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
