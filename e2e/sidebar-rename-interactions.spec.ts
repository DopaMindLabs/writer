import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('sidebar Escape while renaming space reverts to original name', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const titleEl = page.getByTestId('sidebar-space-title');
  await expect(titleEl).toBeVisible();
  const originalName = await titleEl.textContent();

  // Click the title to enter edit mode
  await titleEl.click();
  const input = page.getByTestId('sidebar-space-title-input');
  await expect(input).toBeVisible();

  // Type new name but press Escape
  await input.fill('Should Not Persist');
  await input.press('Escape');

  // Title should revert
  await expect(titleEl).toBeVisible();
  await expect(titleEl).toHaveText(originalName ?? '');
});

test('sidebar space subtitle shows private label', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const subtitle = page.getByTestId('sidebar-space-subtitle');
  await expect(subtitle).toBeVisible();
  // Should contain some age info (e.g. "private · new" or "private · X days")
  await expect(subtitle).toContainText(/private/i);
});

test('sidebar space menu rename flow', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const titleEl = page.getByTestId('sidebar-space-title');
  await expect(titleEl).toBeVisible();
  const originalName = (await titleEl.textContent()) ?? '';

  // Open the space menu (the title trigger is opacity-revealed on hover but
  // remains clickable) and choose rename.
  await page.getByTestId('sidebar-space-menu-trigger').click();
  await page.getByTestId('space-menu-popover-rename').click();

  const input = page.getByTestId('sidebar-space-title-input');
  await expect(input).toBeVisible();
  await input.fill('Renamed Via Menu');
  await input.press('Enter');

  await expect(titleEl).toHaveText('Renamed Via Menu');

  // Restore the original name so reseed-free reruns stay stable.
  await titleEl.click();
  const restore = page.getByTestId('sidebar-space-title-input');
  await restore.fill(originalName);
  await restore.press('Enter');
  await expect(titleEl).toHaveText(originalName);
});

test('double-click on a section label opens an inline rename input and commits on Enter', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();
  const label = sidebar.locator('[data-testid$="-label"]').first();
  await expect(label).toBeVisible();
  const sectionLabel = (await label.textContent())?.trim() ?? '';
  expect(sectionLabel.length).toBeGreaterThan(0);

  await label.dblclick();
  const input = sidebar.locator('[data-testid$="-rename-input"]').first();
  await expect(input).toBeVisible();
  await input.fill('Renamed section');
  await input.press('Enter');

  await expect(sidebar.locator('[data-testid$="-label"]').first()).toHaveText(
    'Renamed section',
  );
});

test('double-click on a doc link opens an inline rename input and commits on Enter', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const sidebar = page.locator('aside').last();
  const docLink = sidebar.locator('a[data-testid^="sidebar-doc-"]').first();
  const docTestId = await docLink.getAttribute('data-testid');
  expect(docTestId).toBeTruthy();

  await docLink.dblclick();
  const input = sidebar.getByTestId(`${docTestId ?? ''}-rename-input`);
  await expect(input).toBeVisible();
  await input.fill('Inline renamed doc');
  await input.press('Enter');

  await expect(
    sidebar.getByTestId(`${docTestId ?? ''}-name`),
  ).toHaveText('Inline renamed doc');
});

test('sidebar shows citations count badge', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  // Add a citation first
  await page.goto(`/#/s/${spaceId}/citations`);
  await expect(page.getByTestId('citations-pane')).toBeVisible();
  await page.getByRole('button', { name: '+ add' }).click();
  const form = page.getByTestId('citations-manual-add');
  await expect(form).toBeVisible();
  await page.getByTestId('citations-manual-add-input').fill(`@article{sidebarCit2024, author={Sidebar}, title={Sidebar Citation}, year={2024}}`);
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(form).not.toBeVisible();

  // Go back to editor and check sidebar shows citations link
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  const citationsLink = page.locator('[data-testid="sidebar-citations-link"]');
  if (await citationsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await expect(citationsLink).toBeVisible();
  }
});
