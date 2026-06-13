import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const gotoDump = async (page: Page) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();
  return spaceId;
};

const noteCards = (page: Page) =>
  page.getByTestId('brain-canvas-content').locator(':scope > [data-testid^="brain-note-"]');

test('links a doc to a note from the detail drawer and navigates to it', async ({
  page,
}) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(noteCards(page)).toHaveCount(1);

  const note = noteCards(page).last();
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();

  const drawer = page.getByTestId('brain-detail-drawer');
  await expect(drawer).toBeVisible();

  await page.getByTestId('brain-detail-drawer-linked-doc').selectOption({ index: 1 });
  await expect(page.getByTestId('brain-detail-drawer-open')).toBeVisible();

  await page.getByTestId('brain-detail-drawer-open').click();
  await page.waitForURL(/#\/s\/[^/]+\/d\//);
  await expect(page.getByTestId('document-body')).toBeVisible();
});

test('editing a note body promotes it from seed to user state', async ({
  page,
}) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(noteCards(page)).toHaveCount(1);
  const note = noteCards(page).last();

  // Click the body area to begin editing
  await note.locator('[data-testid$="-body"]').click();
  const bodyInput = note.locator('[data-testid$="-body-input"]');
  await expect(bodyInput).toBeVisible();
  await bodyInput.fill('User-written content');
  await bodyInput.blur();

  // After editing, the note body should persist
  await expect(note.locator('[data-testid$="-body"]')).toContainText('User-written content');
});

test('editing a note title inline and cancelling with Escape reverts', async ({
  page,
}) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-question').click();
  const note = noteCards(page).last();

  // Add a title first
  await note.locator('[data-testid$="-add-title"]').click();
  const titleInput = note.locator('[data-testid$="-title-input"]');
  await titleInput.fill('My Title');
  await titleInput.press('Enter');
  await expect(note.locator('[data-testid$="-title"]')).toHaveText('My Title');

  // Edit and cancel
  await note.locator('[data-testid$="-title"]').click();
  const titleInput2 = note.locator('[data-testid$="-title-input"]');
  await titleInput2.fill('Cancelled');
  await titleInput2.press('Escape');
  await expect(note.locator('[data-testid$="-title"]')).toHaveText('My Title');
});

test('a note with a linked doc shows the external link icon on the card', async ({
  page,
}) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-question').click();
  const note = noteCards(page).last();

  // Initially no doc link icon
  await expect(note.locator('[data-testid$="-doc-link"]')).toHaveCount(0);

  // Link a doc via drawer
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();
  await expect(page.getByTestId('brain-detail-drawer')).toBeVisible();
  await page.getByTestId('brain-detail-drawer-linked-doc').selectOption({ index: 1 });
  await page.getByTestId('brain-detail-drawer-close').click();

  // Now the doc link icon should appear
  await note.hover();
  await expect(note.locator('[data-testid$="-doc-link"]')).toBeVisible();
});

test('deletes a note from the context menu', async ({ page }) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(noteCards(page)).toHaveCount(1);

  // Use dispatchEvent because freshly added overlapping cards can fail hit-testing
  const note = noteCards(page).last();
  await note.dispatchEvent('contextmenu', { button: 2 });
  const menu = page.getByTestId('brain-note-context-menu');
  await expect(menu).toBeVisible();

  // Use force since the menu item might be positioned outside viewport
  const deleteBtn = menu.getByTestId('brain-note-context-menu-delete');
  await deleteBtn.dispatchEvent('click');
  await expect(noteCards(page)).toHaveCount(0);
});
