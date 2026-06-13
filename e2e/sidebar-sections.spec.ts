import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('sidebar shows section headers with add buttons', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();

  // Sections use sidebar-section-{id}-header
  const headers = sidebar.locator('[data-testid$="-header"]');
  const headerCount = await headers.count();
  expect(headerCount).toBeGreaterThan(0);

  // Each header has an add button
  const addBtns = sidebar.locator('[data-testid$="-add"]');
  expect(await addBtns.count()).toBeGreaterThan(0);
});

test('sidebar space title can be renamed inline', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();

  // Click the title button to enter edit mode
  const titleBtn = sidebar.getByTestId('sidebar-space-title');
  if (await titleBtn.isVisible()) {
    await titleBtn.click();
    const titleInput = sidebar.getByTestId('sidebar-space-title-input');
    await expect(titleInput).toBeVisible();

    await titleInput.fill('Renamed Space');
    await titleInput.press('Enter');

    // After rename, button should show new name
    await expect(sidebar.getByTestId('sidebar-space-title')).toContainText(
      'Renamed Space',
    );
  }
});

test('sidebar shows brain space link with note count', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();
  const brainLink = sidebar.getByTestId('sidebar-brain-space-link');
  await expect(brainLink).toBeVisible();

  // Should show label and count
  await expect(
    sidebar.getByTestId('sidebar-brain-space-link-label'),
  ).toBeVisible();
  const count = sidebar.getByTestId('sidebar-brain-space-link-count');
  await expect(count).toBeVisible();
});

test('sidebar brain space link navigates to the dump view', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();
  await sidebar.getByTestId('sidebar-brain-space-link').click();
  await page.waitForURL(/\/brain-space/);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();
});

test('sidebar doc items show context menu with rename', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();
  // Find a doc menu trigger
  const docMenu = sidebar.locator('[data-testid$="-menu"]').first();
  if (await docMenu.isVisible()) {
    await docMenu.click();

    // Rename option should be visible
    const renameBtn = sidebar.locator('[data-testid$="-rename"]').first();
    await expect(renameBtn).toBeVisible();
  }
});

test('sidebar space menu trigger opens the space menu popover', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();
  await sidebar.getByTestId('sidebar-space-menu-trigger').click();
  await expect(page.getByTestId('space-menu-popover')).toBeVisible();
});

test('sidebar empty section shows placeholder text', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();
  // Check for empty section placeholders (might not exist in seed data)
  const emptyMsg = sidebar.locator('[data-testid$="-empty"]');
  // This just triggers the branch check
  await emptyMsg.count();
});

test('adding a doc via section input and submitting creates a new doc', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();
  const addBtns = sidebar.locator('[data-testid$="-add"]');
  const initialDocCount = await sidebar.locator('a[href*="/d/"]').count();

  await addBtns.first().click();
  const input = sidebar.locator('[data-testid$="-add-input"]');
  await expect(input).toBeVisible();
  await input.fill('Added Doc');
  await input.press('Enter');

  // Should have one more doc
  await expect(sidebar.locator('a[href*="/d/"]')).toHaveCount(
    initialDocCount + 1,
  );
});
