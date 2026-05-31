import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

const BIB = `@article{rx1, author = {Author, A.}, title = {First Ref}, year = {2020}}
@book{rx2, title = {Second Ref}, year = {2021}}`;

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

// Populates a space with citations + notes so the markdown-zip export walks
// its populated render paths (renderCitationsMd / renderNotesMd byKind +
// title-heading vs body-heading), not just the empty-state branches.
test('exports a space populated with citations and notes', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await page.goto(`/#/s/${spaceId}/citations`);
  await page.getByTestId('citations-add-toggle').click();
  await page.getByTestId('citations-manual-add-input').fill(BIB);
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(page.getByTestId('citations-status')).toContainText(/imported/i);

  await page.goto(`/#/s/${spaceId}/dump`);
  const notes = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]');

  // A titled note (heading from title) of one kind...
  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(notes).toHaveCount(1);
  const titled = notes.first();
  await titled.hover();
  await titled.locator('[data-testid$="-add-title"]').click();
  await titled.locator('[data-testid$="-title-input"]').fill('A titled note');
  await titled.locator('[data-testid$="-title-input"]').press('Enter');

  // ...and a body-only note of another kind (heading from first body line).
  await page.getByTestId('brain-canvas-tool-source').click();
  await expect(notes).toHaveCount(2);
  const bodyOnly = notes.nth(1);
  await bodyOnly.locator('[data-testid$="-body"]').click();
  await bodyOnly.locator('[data-testid$="-body-input"]').fill('Body only note');
  await bodyOnly.locator('[data-testid$="-body-input"]').blur();

  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  await page
    .locator('aside')
    .last()
    .getByTestId('sidebar-space-menu-trigger')
    .click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('space-menu-popover-export').click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.zip$/);
});
