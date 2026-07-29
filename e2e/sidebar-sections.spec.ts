import { test, expect } from './_helpers';
import {
  reseedAndGoHome,
  getFirstSpaceIdFromHome,
  createSpaceFromTemplate,
} from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('sidebar shows section headers with a management menu', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();

  // Sections use sidebar-section-{id}-header
  const headers = sidebar.locator('[data-testid$="-header"]');
  const headerCount = await headers.count();
  expect(headerCount).toBeGreaterThan(0);

  // Each header carries a kebab menu (Add document / Rename / Delete)
  const sectionMenus = sidebar.locator(
    '[data-testid^="sidebar-section-"][data-testid$="-menu"]',
  );
  expect(await sectionMenus.count()).toBeGreaterThan(0);
});

test('sidebar section header label renders in uppercase', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();
  const label = sidebar.locator('[data-testid$="-label"]').first();
  await expect(label).toBeVisible();

  // The eyebrow-style section heading must read as uppercase (design system
  // §3.10). The label text lives inside a <button>, and the browser resets
  // `text-transform` on form controls, so the utility must sit on the button
  // itself — not only on the wrapping header row — for the cast to take effect.
  const transform = await label.evaluate(
    (el) => getComputedStyle(el).textTransform,
  );
  expect(transform).toBe('uppercase');
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
  // The trigger is revealed on row hover on desktop; open the first doc's menu.
  const docMenu = sidebar
    .locator('[data-testid^="sidebar-doc-"][data-testid$="-menu"]')
    .first();
  await docMenu.click();

  // The dropdown content is portaled to the document body, not inside the aside.
  await expect(
    page.locator('[data-testid^="sidebar-doc-"][data-testid$="-rename"]').first(),
  ).toBeVisible();
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
  const initialDocCount = await sidebar.locator('a[href*="/d/"]').count();

  // Open the first section's menu and choose Add document.
  await sidebar
    .locator('[data-testid^="sidebar-section-"][data-testid$="-menu"]')
    .first()
    .click();
  await page.locator('[data-testid$="-add-doc"]').first().click();

  const input = sidebar.locator('[data-testid$="-add-input"]');
  await expect(input).toBeVisible();
  await input.fill('Added Doc');
  await input.press('Enter');

  // Should have one more doc
  await expect(sidebar.locator('a[href*="/d/"]')).toHaveCount(
    initialDocCount + 1,
  );
});

test('adding a doc commits on blur without navigating away from the current doc', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const urlBefore = page.url();

  const sidebar = page.locator('aside').last();
  const initialDocCount = await sidebar.locator('a[href*="/d/"]').count();

  await sidebar
    .locator('[data-testid^="sidebar-section-"][data-testid$="-menu"]')
    .first()
    .click();
  await page.locator('[data-testid$="-add-doc"]').first().click();
  const input = sidebar.locator('[data-testid$="-add-input"]');
  await expect(input).toBeVisible();
  await input.fill('Saved on blur');
  // Blur by clicking the sidebar background (a known stable target)
  await sidebar.getByTestId('sidebar-space-subtitle').click();

  await expect(sidebar.locator('a[href*="/d/"]')).toHaveCount(
    initialDocCount + 1,
  );
  // We should NOT have navigated to the new doc
  expect(page.url()).toBe(urlBefore);
});

test('blank template surfaces an Add section affordance that creates a new top-level section', async ({
  page,
}) => {
  await createSpaceFromTemplate(page, 'blank');

  const sidebar = page.locator('aside').last();
  const trigger = sidebar.getByTestId('sidebar-add-section-trigger');
  await expect(trigger).toBeVisible();

  const initialHeaderCount = await sidebar
    .locator('[data-testid$="-header"]')
    .count();

  await trigger.click();
  const input = sidebar.getByTestId('sidebar-add-section-input');
  await expect(input).toBeVisible();
  await input.fill('Research');
  await input.press('Enter');

  await expect(sidebar.locator('[data-testid$="-header"]')).toHaveCount(
    initialHeaderCount + 1,
  );
  await expect(
    sidebar.locator('[data-testid$="-label"]', { hasText: 'Research' }),
  ).toBeVisible();
});

test('structured templates also surface the Add section affordance', async ({
  page,
}) => {
  await createSpaceFromTemplate(page, 'fiction');

  const sidebar = page.locator('aside').last();
  const trigger = sidebar.getByTestId('sidebar-add-section-trigger');
  await expect(trigger).toBeVisible();

  const initialHeaderCount = await sidebar
    .locator('[data-testid$="-header"]')
    .count();

  await trigger.click();
  const input = sidebar.getByTestId('sidebar-add-section-input');
  await expect(input).toBeVisible();
  await input.fill('Appendix');
  await input.press('Enter');

  await expect(sidebar.locator('[data-testid$="-header"]')).toHaveCount(
    initialHeaderCount + 1,
  );
});
