import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('brain space detail drawer edits a note and links a doc', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/dump`);

  const noteCards = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]');
  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(noteCards).toHaveCount(1);

  const note = noteCards.last();
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();

  const drawer = page.getByTestId('brain-detail-drawer');
  await expect(drawer).toBeVisible();
  await expect(
    page.getByTestId('brain-detail-drawer-connections-empty'),
  ).toBeVisible();
  await expect(page.getByTestId('brain-detail-drawer-open')).toHaveCount(0);

  await page.getByTestId('brain-detail-drawer-title').fill('Linked question');
  await page.getByTestId('brain-detail-drawer-body').fill('Some note body');

  await page
    .getByTestId('brain-detail-drawer-linked-doc')
    .selectOption({ index: 1 });
  await expect(page.getByTestId('brain-detail-drawer-open')).toBeVisible();
});
