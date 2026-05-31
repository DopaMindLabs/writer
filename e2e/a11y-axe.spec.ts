import {
  test,
  expect,
  expectNoA11yViolations,
  reseedAndGoHome,
  gotoFirstDoc,
} from './_helpers';

const settle = async (page: import('@playwright/test').Page) => {
  await page.waitForFunction(
    () => !document.body.innerText.includes('Booting…'),
  );
};

test.describe('axe accessibility scans', () => {
  test('home page has no WCAG A/AA violations', async ({ page }) => {
    await reseedAndGoHome(page);
    await expectNoA11yViolations(page, 'home');
  });

  test('help center has no WCAG A/AA violations', async ({ page }) => {
    await reseedAndGoHome(page);
    await page.goto('/#/help');
    await settle(page);
    await expect(
      page.getByRole('heading', { level: 1 }).first(),
    ).toBeVisible();
    await expectNoA11yViolations(page, 'help');
  });

  test('accessibility settings tab has no WCAG A/AA violations', async ({
    page,
  }) => {
    await reseedAndGoHome(page);
    await page.goto('/#/settings?tab=accessibility');
    await settle(page);
    await expect(
      page.getByRole('heading', { name: 'Accessibility', level: 1 }),
    ).toBeVisible();
    await expectNoA11yViolations(page, 'settings/accessibility');
  });

  test('write surface has no WCAG A/AA violations', async ({ page }) => {
    await reseedAndGoHome(page);
    await gotoFirstDoc(page);
    await expect(page.getByLabel('Document body')).toBeVisible();
    await expectNoA11yViolations(page, 'write');
  });
});
