import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('brain space adds a note from the toolbar and deletes it via the detail drawer', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/dump`);

  const canvas = page.getByTestId('brain-canvas');
  await expect(canvas).toBeVisible();
  await expect(page.getByTestId('brain-canvas-toolbar')).toBeVisible();

  const noteCards = canvas.locator(':scope > [data-testid^="brain-note-"]');
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
