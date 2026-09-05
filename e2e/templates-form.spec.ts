import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('create a space with custom name and tag', async ({ page }) => {
  await page.goto('/#/new');

  // Select a non-default template (e.g. the second one)
  const cards = page.locator('[data-testid^="templates-card-"]');
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  if (count > 1) {
    await cards.nth(1).click();
  }

  // Clear and set a custom name
  const nameInput = page.getByTestId('templates-name-input');
  await nameInput.fill('My Custom Space');

  // Set a custom tag
  const tagInput = page.getByTestId('templates-tag-input');
  await tagInput.fill('MCS');

  // With no cloud write lock engaged, no lock notice is shown.
  await expect(page.getByTestId('templates-lock-banner')).toHaveCount(0);

  // Submit the form
  await page.getByTestId('templates-submit').click();

  // Should navigate to the new space
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
});

test.describe('cloud write lock', () => {
  test('blocks creating a space while the key-mismatch lock is engaged', async ({ page }) => {
    await page.goto('/?reseed=1&cloud-mismatch=1#/new');

    const banner = page.getByTestId('templates-lock-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/encryption key has changed/i);
    await expect(page.getByTestId('templates-submit')).toBeDisabled();

    await page.getByRole('button', { name: /open cloud sync settings/i }).click();
    await page.waitForURL(/#\/settings\?tab=cloudSync/);
  });

  test('blocks creating a space while the keyless lock is engaged', async ({ page }) => {
    await page.goto('/?reseed=1&cloud-keyless=1#/new');

    const banner = page.getByTestId('templates-lock-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/signed in without an encryption key/i);
    await expect(page.getByTestId('templates-submit')).toBeDisabled();
  });
});

test('template form uses default name if custom name is cleared', async ({
  page,
}) => {
  await page.goto('/#/new');

  const cards = page.locator('[data-testid^="templates-card-"]');
  await expect(cards.first()).toBeVisible();
  await cards.first().click();

  // Clear name and tag fields entirely
  const nameInput = page.getByTestId('templates-name-input');
  await nameInput.fill('');

  const tagInput = page.getByTestId('templates-tag-input');
  await tagInput.fill('');

  // Submit — should fall back to the template defaults
  await page.getByTestId('templates-submit').click();
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
});

test('selecting a different template updates name and tag inputs', async ({
  page,
}) => {
  await page.goto('/#/new');

  const cards = page.locator('[data-testid^="templates-card-"]');
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  if (count < 2) return;

  // Click first card, note its name
  await cards.nth(0).click();
  const nameInput = page.getByTestId('templates-name-input');
  const firstName = await nameInput.inputValue();

  // Click second card — name should change
  await cards.nth(1).click();
  const secondName = await nameInput.inputValue();
  expect(secondName).not.toBe(firstName);
});
