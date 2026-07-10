import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';
import axe from 'axe-core';

export const reseedAndGoHome = async (page: Page): Promise<void> => {
  await page.goto('/?reseed=1#/');
  await page.waitForFunction(() => !document.body.innerText.includes('Booting…'));
};

export const getFirstSpaceIdFromHome = async (page: Page): Promise<string> => {
  const continueLink = page.getByRole('link', { name: /Continue writing/i });
  const href = await continueLink.getAttribute('href');
  if (!href) throw new Error('Expected "Continue writing" link to be present after reseed');
  const match = href.match(/\/s\/([^/?#]+)/);
  if (!match) throw new Error(`Could not parse spaceId from href: ${href}`);
  return match[1];
};

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

export const createSpaceFromTemplate = async (
  page: Page,
  templateId: string,
  opts?: { name?: string; tag?: string },
): Promise<string> => {
  await page
    .getByRole('link', { name: /Start a new space|Create new space/i })
    .first()
    .click();
  await expect(page.getByTestId('templates-screen')).toBeVisible();
  await page.getByTestId(`templates-card-${templateId}`).click();
  if (opts?.name !== undefined) await page.locator('#space-name').fill(opts.name);
  if (opts?.tag !== undefined) await page.locator('#space-tag').fill(opts.tag);
  await page.getByTestId('templates-submit').click();
  await page.waitForURL(/#\/s\/[^/]+/);
  const spaceId = new URL(page.url()).hash.match(/\/s\/([^/?#]+)/)?.[1];
  if (!spaceId) throw new Error(`Could not extract spaceId from ${page.url()}`);
  return spaceId;
};

export const stubDirectoryPicker = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      writable: true,
      value: () => Promise.resolve({ name: 'Sync Folder', kind: 'directory' }),
    });
  });
};

const TOURS_STORAGE_KEY = 'lipsum-tours';
const ALL_TOUR_IDS = ['welcome', 'writer', 'citations', 'brainspace'];

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

interface AxeNode {
  target: string[];
}
interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

interface A11yScanOptions {
  context?: string;
  disableRules?: string[];
}

export const expectNoA11yViolations = async (
  page: Page,
  options: A11yScanOptions = {},
): Promise<void> => {
  const { context, disableRules = [] } = options;
  await page.evaluate(axe.source);
  const violations = (await page.evaluate(async (rules: string[]) => {
    const result = await (
      window as unknown as {
        axe: { run: (opts: unknown) => Promise<{ violations: AxeViolation[] }> };
      }
    ).axe.run({
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      rules: Object.fromEntries(rules.map((id) => [id, { enabled: false }])),
    });
    return result.violations;
  }, disableRules)) as AxeViolation[];

  if (violations.length > 0) {
    const summary = violations
      .map(
        (v) =>
          `  [${v.impact ?? 'n/a'}] ${v.id}: ${v.help} (${v.nodes.length} node(s))\n    ${v.helpUrl}`,
      )
      .join('\n');
    throw new Error(
      `axe found ${String(violations.length)} accessibility violation(s)` +
        `${context ? ` on ${context}` : ''}:\n${summary}`,
    );
  }
};

export { expect };
