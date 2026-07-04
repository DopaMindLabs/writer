import { test, expect } from './_helpers';
import { reseedAndGoHome, expectNoA11yViolations } from './_helpers';

const STRUCTURE_ONLY = { disableRules: ['color-contrast'] };

test.describe('local-network sync beta gating', () => {
  test('the local-network sync section is absent without the flag', async ({ page }) => {
    await reseedAndGoHome(page);
    await page.goto('/#/settings?tab=account');
    await expect(page.getByTestId('account-privacy-notice')).toBeVisible();
    await expect(page.getByTestId('local-network-sync-section')).toHaveCount(0);
    await expectNoA11yViolations(page, {
      context: 'account tab without local-network sync',
      ...STRUCTURE_ONLY,
    });
  });

  test('?local-network-sync=on reveals the opt-in shell and strips the param', async ({
    page,
  }) => {
    await reseedAndGoHome(page);
    await page.goto('/?local-network-sync=on#/settings?tab=account');
    await expect(page.getByTestId('local-network-sync-section')).toBeVisible();
    expect(page.url()).not.toContain('local-network-sync');
    await expect(page.getByTestId('local-network-sync-pair')).toBeDisabled();
    await expect(page.getByTestId('local-network-sync-join')).toBeDisabled();
    await expectNoA11yViolations(page, {
      context: 'account tab with local-network sync shell',
      ...STRUCTURE_ONLY,
    });
  });

  test('the user setting enables and disables pairing controls', async ({ page }) => {
    await reseedAndGoHome(page);
    await page.goto('/?local-network-sync=on#/settings?tab=account');
    await page.getByTestId('local-network-sync-toggle').click();
    await expect(page.getByTestId('local-network-sync-pair')).toBeEnabled();
    await expect(page.getByTestId('local-network-sync-join')).toBeEnabled();
    await page.getByTestId('local-network-sync-toggle').click();
    await expect(page.getByTestId('local-network-sync-pair')).toBeDisabled();
    await expect(page.getByTestId('local-network-sync-join')).toBeDisabled();
  });

  test('?local-network-sync=off hides the shell again', async ({ page }) => {
    await reseedAndGoHome(page);
    await page.goto('/?local-network-sync=on#/settings?tab=account');
    await expect(page.getByTestId('local-network-sync-section')).toBeVisible();
    await page.goto('/?local-network-sync=off#/settings?tab=account');
    await expect(page.getByTestId('local-network-sync-section')).toHaveCount(0);
  });
});
