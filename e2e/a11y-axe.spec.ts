import type { Page } from '@playwright/test';
import {
  test,
  expect,
  expectNoA11yViolations,
  reseedAndGoHome,
  gotoFirstDoc,
} from './_helpers';

const settle = async (page: Page) => {
  await page.waitForFunction(
    () => !document.body.innerText.includes('Booting…'),
  );
};

// The default light/dark themes use intentionally faint "meta" inks (counts,
// shortcuts) that sit below the 4.5:1 small-text AA bar by design — a documented
// exception (docs/design-system.md §11.3). Structure/semantics are still scanned
// in full; contrast is asserted against the high-contrast theme below.
const STRUCTURE_ONLY = { disableRules: ['color-contrast'] };

test.describe('axe accessibility scans (structure & semantics)', () => {
  test('home page', async ({ page }) => {
    await reseedAndGoHome(page);
    await expectNoA11yViolations(page, { context: 'home', ...STRUCTURE_ONLY });
  });

  test('help center', async ({ page }) => {
    await reseedAndGoHome(page);
    await page.goto('/#/help');
    await settle(page);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expectNoA11yViolations(page, { context: 'help', ...STRUCTURE_ONLY });
  });

  test('accessibility settings tab', async ({ page }) => {
    await reseedAndGoHome(page);
    await page.goto('/#/settings?tab=accessibility');
    await settle(page);
    await expect(
      page.getByRole('heading', { name: 'Accessibility', level: 1 }),
    ).toBeVisible();
    await expectNoA11yViolations(page, {
      context: 'settings/accessibility',
      ...STRUCTURE_ONLY,
    });
  });

  test('write surface', async ({ page }) => {
    await reseedAndGoHome(page);
    await gotoFirstDoc(page);
    await expect(page.getByLabel('Document body')).toBeVisible();
    await expectNoA11yViolations(page, { context: 'write', ...STRUCTURE_ONLY });
  });
});

test.describe('axe accessibility scans (high-contrast theme, full contrast)', () => {
  test('home page meets full WCAG A/AA including contrast in hc-light', async ({
    page,
  }) => {
    // Seed the high-contrast theme before the app boots.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('lorem-ui', JSON.stringify({ theme: 'hc-light' }));
      } catch {
        /* storage unavailable on about:blank */
      }
    });
    await reseedAndGoHome(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'hc-light');
    await expectNoA11yViolations(page, { context: 'home (hc-light)' });
  });
});
