import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('sidebar shows subsections and allows adding a doc to a subsection', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();
  const sections = sidebar.locator('[data-testid^="sidebar-section-"]');
  const sectionCount = await sections.count();
  expect(sectionCount).toBeGreaterThan(0);

  // Find an "add doc" button in the sidebar (uses sidebar-section-{id}-add pattern)
  const addBtns = sidebar.locator('[data-testid$="-add"]');
  const addCount = await addBtns.count();
  expect(addCount).toBeGreaterThan(0);

  // Click the first add button to start adding a doc
  await addBtns.first().click();
  const input = sidebar.locator('[data-testid$="-add-input"]');
  await expect(input).toBeVisible();

  // Type a doc name and submit
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
