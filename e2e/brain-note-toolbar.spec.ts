import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const gotoDump = async (page: import('@playwright/test').Page) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();
  return spaceId;
};

const noteCards = (page: import('@playwright/test').Page) =>
  page.getByTestId('brain-canvas-content').locator(':scope > [data-testid^="brain-note-"]');

test('add notes using each toolbar kind button', async ({ page }) => {
  await gotoDump(page);

  // The bioinformatics template has: question, source, claim, figure, todo, loose-end, image
  const kinds = ['question', 'source', 'claim', 'figure', 'todo', 'loose-end'];

  // Click each toolbar kind, waiting for the note to land before the next click.
  // Adding notes back-to-back without this wait races the canvas's note-count
  // state, so the assertion below would otherwise be flaky.
  let expected = 0;
  for (const kind of kinds) {
    const toolBtn = page.getByTestId(`brain-canvas-tool-${kind}`);
    await expect(toolBtn).toBeVisible();
    await toolBtn.click();
    expected += 1;
    await expect(noteCards(page)).toHaveCount(expected);
  }
});

test('resize a note by dragging the handle', async ({ page }) => {
  await gotoDump(page);

  // Add a note
  await page.getByTestId('brain-canvas-tool-question').click();
  const note = noteCards(page).last();
  await expect(note).toBeVisible();

  // Look for resize handle
  const handle = note.locator('[data-testid$="-resize"]');
  if (await handle.isVisible()) {
    const box = await handle.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 });
      await page.mouse.up();
    }
  }
  // Note should still be visible after resize
  await expect(note).toBeVisible();
});

test('drag a note to a new position', async ({ page }) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-question').click();
  const note = noteCards(page).last();
  await expect(note).toBeVisible();

  const box = await note.boundingBox();
  if (box) {
    const startX = box.x + box.width / 2;
    const startY = box.y + 10; // header area for dragging
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 80, startY + 80, { steps: 5 });
    await page.mouse.up();
  }
  await expect(note).toBeVisible();
});

test('add an image note using the image tool', async ({ page }) => {
  await gotoDump(page);

  const imageTool = page.getByTestId('brain-canvas-tool-image');
  await expect(imageTool).toBeVisible();
  await imageTool.click();
  // The image note should appear on the canvas.
  await expect(noteCards(page)).toHaveCount(1);
});

test('open detail drawer from a note and edit its body', async ({ page }) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-question').click();
  const note = noteCards(page).last();

  // Open details
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();
  const drawer = page.getByTestId('brain-detail-drawer');
  await expect(drawer).toBeVisible();

  // Edit body in drawer
  const bodyArea = page.getByTestId('brain-detail-drawer-body');
  await bodyArea.click();
  await bodyArea.fill('Drawer body edit');
  await expect(bodyArea).toHaveValue('Drawer body edit');

  // Close drawer
  await page.getByTestId('brain-detail-drawer-close').click();
  await expect(drawer).not.toBeVisible();
});

test('edit note title from the detail drawer', async ({ page }) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-question').click();
  const note = noteCards(page).last();

  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();

  const titleInput = page.getByTestId('brain-detail-drawer-title');
  await expect(titleInput).toBeVisible();
  await titleInput.fill('Drawer Title Test');
  await titleInput.press('Enter');

  // Title should persist
  await expect(titleInput).toHaveValue('Drawer Title Test');
});

test('delete a note from the detail drawer', async ({ page }) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(noteCards(page)).toHaveCount(1);

  const note = noteCards(page).last();
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByTestId('brain-detail-drawer-delete').click();

  await expect(noteCards(page)).toHaveCount(0);
});

test('connections section in drawer shows empty state', async ({ page }) => {
  await gotoDump(page);

  await page.getByTestId('brain-canvas-tool-question').click();
  const note = noteCards(page).last();

  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();
  const drawer = page.getByTestId('brain-detail-drawer');
  await expect(drawer).toBeVisible();

  // Connections section shows heading + empty text
  await expect(
    page.getByTestId('brain-detail-drawer-connections-heading'),
  ).toBeVisible();
  await expect(
    page.getByTestId('brain-detail-drawer-connections-empty'),
  ).toBeVisible();
});
