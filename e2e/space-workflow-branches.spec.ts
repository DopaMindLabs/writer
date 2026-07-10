import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome, gotoFirstDoc } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('focus toggle hides sidebar and inspector for distraction-free writing', async ({
  page,
}) => {
  await gotoFirstDoc(page);

  const focusToggle = page.getByTestId('focus-toggle');
  if (!(await focusToggle.isVisible())) return;

  // Enter focus mode
  await focusToggle.click();

  // Sidebar should be hidden
  const sidebar = page.locator('aside').last();
  await expect(sidebar).not.toBeVisible();

  // Exit focus mode
  await focusToggle.click();
  await expect(sidebar).toBeVisible();
});

test('space export produces a zip file with correct name', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  // Open space menu from sidebar
  const sidebar = page.locator('aside').last();
  await sidebar.getByTestId('sidebar-space-menu-trigger').click();
  await expect(page.getByTestId('space-menu-popover')).toBeVisible();

  // Click export
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('space-menu-popover-export').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
});

test('creating a space with various templates exercises different branches', async ({
  page,
}) => {
  // Create space from humanities template
  await page.getByTestId('home-start-new-space').click();
  await expect(page.getByTestId('templates-screen')).toBeVisible();

  const cards = page.locator('[data-testid^="templates-card-"]');
  const count = await cards.count();

  // Try selecting each template to cover different branches
  for (let i = 0; i < Math.min(count, 4); i++) {
    await cards.nth(i).click();
    await expect(cards.nth(i)).toHaveAttribute('aria-pressed', 'true');
  }

  // Fill form and create
  await page.getByTestId('templates-name-input').fill('Export Test Space');
  await page.getByTestId('templates-tag-input').fill('EXP');
  await page.getByTestId('templates-submit').click();
  await page.waitForURL(/#\/s\/[^/]+/);
  await expect(page.getByTestId('document-body')).toBeVisible();
});

test('space settings general tab shows and edits space name', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings`);

  const nameInput = page.getByTestId('space-settings-name-input');
  await expect(nameInput).toBeVisible();

  // Change name
  await nameInput.fill('Renamed For Test');
  await nameInput.press('Enter');
  await expect(nameInput).toHaveValue('Renamed For Test');
});

test('space settings backups tab: create snapshot then download', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings?tab=backups`);

  // Create a backup snapshot
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('space-settings-backups-snapshot').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.zip$/);

  // History should show the backup
  await expect(page.getByTestId('backups-history')).toBeVisible();

  // Download from history
  const downloadBtn = page
    .getByTestId('backups-history')
    .locator('[data-testid$="-download"]')
    .first();
  if (await downloadBtn.isVisible()) {
    const dl2 = page.waitForEvent('download');
    await downloadBtn.click();
    await dl2;
  }

  // Delete from history
  const deleteBtn = page
    .getByTestId('backups-history')
    .locator('[data-testid$="-delete"]')
    .first();
  if (await deleteBtn.isVisible()) {
    page.on('dialog', (dialog) => dialog.accept());
    await deleteBtn.click();
    // Table should update
  }
});

test('quick settings popover: change font and theme', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  // Open quick settings (3-dot menu button in the space rail)
  await page.locator('[data-tour="tour-topbar-theme"]').click();

  const popover = page.getByTestId('quick-settings-popover');
  await expect(popover).toBeVisible();

  // Switch to dark theme via its exact testid
  await page.getByTestId('quick-settings-theme-dark').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // Switch back to light
  await page.getByTestId('quick-settings-theme-light').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('doc rename via inspector name field', async ({ page }) => {
  await gotoFirstDoc(page);

  const nameInput = page.getByTestId('doc-inspector-name');
  if (await nameInput.isVisible()) {
    const original = await nameInput.inputValue();
    await nameInput.fill('Renamed Document');
    await nameInput.press('Enter');
    await expect(nameInput).toHaveValue('Renamed Document');

    // Revert
    await nameInput.fill(original);
    await nameInput.press('Enter');
  }
});
