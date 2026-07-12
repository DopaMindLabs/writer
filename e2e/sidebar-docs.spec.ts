import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('sidebar flattens subsection docs under their parent section and adds at section level', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();
  const sections = sidebar.locator('[data-testid^="sidebar-section-"]');
  expect(await sections.count()).toBeGreaterThan(0);

  // The default template seeds docs under Methods → Pipeline/Stats subsections.
  // These now render flattened under their parent section, so a subsection doc
  // like "Alignment" is visible with no subsection header — the `↳` glyph never
  // appears anywhere in the nav.
  await expect(sidebar.locator('a', { hasText: 'Alignment' })).toBeVisible();
  await expect(sidebar.getByText('↳')).toHaveCount(0);

  // Adding a doc now targets the section level (the only add affordance).
  const addBtns = sidebar.locator('[data-testid$="-add"]');
  expect(await addBtns.count()).toBeGreaterThan(0);
  await addBtns.first().click();
  const input = sidebar.locator('[data-testid$="-add-input"]');
  await expect(input).toBeVisible();

  await input.fill('New Test Doc');
  await input.press('Enter');

  // A new doc link should appear in the sidebar
  await expect(sidebar.locator('a', { hasText: 'New Test Doc' })).toBeVisible();
});

test('sidebar add doc input is dismissed on Escape', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();
  const addBtns = sidebar.locator('[data-testid$="-add"]');
  await addBtns.first().click();
  const input = sidebar.locator('[data-testid$="-add-input"]');
  await expect(input).toBeVisible();

  await input.press('Escape');
  await expect(input).toHaveCount(0);
});

test('sidebar navigate between docs updates the active state', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();
  const links = sidebar.locator('a[href*="/d/"]');
  const linkCount = await links.count();
  expect(linkCount).toBeGreaterThan(1);

  // Click the second link and verify navigation
  await links.nth(1).click();
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  await expect(page.getByTestId('document-body')).toBeVisible();
});
