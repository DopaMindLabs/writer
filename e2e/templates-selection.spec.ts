import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('templates screen shows all templates and allows selecting different ones', async ({
  page,
}) => {
  await page.getByTestId('home-start-new-space').click();
  await expect(page.getByTestId('templates-screen')).toBeVisible();

  const cards = page.locator('[data-testid^="templates-card-"]');
  const count = await cards.count();
  expect(count).toBeGreaterThan(1);

  // Select the second template
  await cards.nth(1).click();
  await expect(cards.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(cards.first()).toHaveAttribute('aria-pressed', 'false');

  // Select the first template again
  await cards.first().click();
  await expect(cards.first()).toHaveAttribute('aria-pressed', 'true');
});

test('templates back link returns to the home screen', async ({ page }) => {
  await page.getByTestId('home-start-new-space').click();
  await expect(page.getByTestId('templates-screen')).toBeVisible();

  await page.getByTestId('templates-back').click();
  await page.waitForURL(/#\//);
  await expect(page.getByTestId('home-start-new-space')).toBeVisible();
});

test('templates submit is enabled when a template is selected and disabled initially before selection', async ({ page }) => {
  await page.getByTestId('home-start-new-space').click();
  await expect(page.getByTestId('templates-screen')).toBeVisible();

  // A template is pre-selected by default, so submit should be enabled
  await expect(page.getByTestId('templates-submit')).toBeEnabled();

  // Filling name and tag should still keep it enabled
  await page.getByTestId('templates-name-input').fill('My Space');
  await page.getByTestId('templates-tag-input').fill('MSP');
  await expect(page.getByTestId('templates-submit')).toBeEnabled();
});

test('creates a space from the second template', async ({ page }) => {
  await page.getByTestId('home-start-new-space').click();
  await expect(page.getByTestId('templates-screen')).toBeVisible();

  const cards = page.locator('[data-testid^="templates-card-"]');
  await cards.nth(1).click();
  await page.getByTestId('templates-name-input').fill('Second Template Space');
  await page.getByTestId('templates-tag-input').fill('STS');
  await page.getByTestId('templates-submit').click();

  await page.waitForURL(/#\/s\/[^/]+/);
  await expect(page.getByTestId('document-body')).toBeVisible();
});
