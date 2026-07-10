import { test, expect, reseedAndGoHome } from './_helpers';

const A11Y_ATTRS = [
  'data-motion',
  'data-text-scale',
  'data-line-spacing',
  'data-link-underline',
  'data-focus',
];

test.describe('Accessibility is additive (non-regression)', () => {
  test('a fresh load applies no behaviour-changing a11y attributes', async ({
    page,
  }) => {
    await reseedAndGoHome(page);
    for (const attr of A11Y_ATTRS) {
      await expect(page.locator('html')).not.toHaveAttribute(attr, /.*/);
    }
    const raw = await page.evaluate(() => localStorage.getItem('lorem-a11y'));
    expect(raw).toBeNull();
  });

  test('a legacy payload without a11y keys still renders defaults', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('lorem-ui', JSON.stringify({ theme: 'light' }));
      } catch {
        /* localStorage unavailable on about:blank */
      }
    });
    await reseedAndGoHome(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    for (const attr of A11Y_ATTRS) {
      await expect(page.locator('html')).not.toHaveAttribute(attr, /.*/);
    }
  });

  test('attributes appear only after opting in and revert on reset', async ({
    page,
  }) => {
    await reseedAndGoHome(page);
    await page.goto('/#/settings?tab=accessibility');
    await page.waitForFunction(
      () => !document.body.innerText.includes('Booting…'),
    );

    await expect(page.locator('html')).not.toHaveAttribute('data-focus', /.*/);
    const focusToggle = page.getByRole('switch', {
      name: 'Enhanced focus indicator',
    });
    await focusToggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-focus', 'enhanced');

    await focusToggle.click();
    await expect(page.locator('html')).not.toHaveAttribute('data-focus', /.*/);
  });
});
