import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('brain space adds a note from the toolbar and deletes it via the detail drawer', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);

  const canvas = page.getByTestId('brain-canvas');
  await expect(canvas).toBeVisible();
  await expect(page.getByTestId('brain-canvas-toolbar')).toBeVisible();

  const noteCards = page.getByTestId('brain-canvas-content').locator(':scope > [data-testid^="brain-note-"]');
  const before = await noteCards.count();

  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(noteCards).toHaveCount(before + 1);

  const note = noteCards.last();
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();

  await expect(page.getByTestId('brain-detail-drawer')).toBeVisible();
  await page.getByTestId('brain-detail-drawer-delete').click();

  await expect(noteCards).toHaveCount(before);
});

test('brain space note opens a context menu on right-click and dismisses on Escape', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);

  const noteCards = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]');
  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(noteCards).toHaveCount(1);

  await noteCards.last().click({ button: 'right' });
  const menu = page.getByTestId('brain-note-context-menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByTestId('brain-note-context-menu-delete')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
});
