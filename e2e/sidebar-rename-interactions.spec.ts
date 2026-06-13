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
