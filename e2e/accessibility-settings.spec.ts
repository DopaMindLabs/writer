import type { Page } from '@playwright/test';
import { test, expect, reseedAndGoHome } from './_helpers';

const gotoAccessibilityTab = async (page: Page): Promise<void> => {
  await reseedAndGoHome(page);
  await page.goto('/#/settings?tab=accessibility');
  await page.waitForFunction(
    () => !document.body.innerText.includes('Booting…'),
  );
  await expect(
    page.getByRole('heading', { name: 'Accessibility', level: 1 }),
  ).toBeVisible();
};

test.describe('Accessibility settings panel', () => {
  test('exposes every preference control', async ({ page }) => {
    await gotoAccessibilityTab(page);
    await expect(
      page.getByRole('radiogroup', { name: 'Theme & contrast' }),
    ).toBeVisible();
    await expect(
      page.getByRole('radiogroup', { name: 'Motion' }),
    ).toBeVisible();
    await expect(page.getByRole('group', { name: 'Text size' })).toBeVisible();
    await expect(
      page.getByRole('group', { name: 'Line spacing' }),
    ).toBeVisible();
    await expect(
      page.getByRole('switch', { name: 'Always underline links' }),
    ).toBeVisible();
    await expect(
      page.getByRole('switch', { name: 'Enhanced focus indicator' }),
    ).toBeVisible();
  });

  test('changing the theme applies and persists', async ({ page }) => {
    await gotoAccessibilityTab(page);
    await page.getByText('Dark', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const persisted = await page.evaluate(() =>
      localStorage.getItem('lorem-ui'),
    );
    expect(persisted).toContain('"theme":"dark"');
  });

  test('text size, motion, links and focus apply to the document', async ({
    page,
  }) => {
    await gotoAccessibilityTab(page);

    await page.getByRole('button', { name: 'Large' }).click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-text-scale',
      'lg',
    );

    await page.getByText('Reduced', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-motion',
      'reduced',
    );

    await page.getByRole('switch', { name: 'Always underline links' }).click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-link-underline',
      'always',
    );

    await page
      .getByRole('switch', { name: 'Enhanced focus indicator' })
      .click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-focus',
      'enhanced',
    );

    const raw = await page.evaluate(() => localStorage.getItem('lorem-a11y'));
    expect(raw).toContain('"textScale":"lg"');
    expect(raw).toContain('"motion":"reduced"');
  });

  test('a preference survives a reload', async ({ page }) => {
    await gotoAccessibilityTab(page);
    await page.getByRole('button', { name: 'Extra large' }).click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-text-scale',
      'xl',
    );
    await page.reload();
    await page.waitForFunction(
      () => !document.body.innerText.includes('Booting…'),
    );
    await expect(page.locator('html')).toHaveAttribute(
      'data-text-scale',
      'xl',
    );
  });
});
