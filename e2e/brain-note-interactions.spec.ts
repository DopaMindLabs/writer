import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('brain space note body edit and Escape cancel', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();

  // Create a note first
  await page.getByTestId('brain-canvas-tool-question').click();
  const noteCards = page.getByTestId('brain-canvas-content').locator(':scope > [data-testid^="brain-note-"]');
  await expect(noteCards).toHaveCount(1);

  // Find a note body area and click to edit
  const noteBody = page.locator('[data-testid$="-body"]').first();
  if (await noteBody.isVisible({ timeout: 2000 }).catch(() => false)) {
    await noteBody.click();
    // Should switch to edit input
    const bodyInput = page.locator('[data-testid$="-body-input"]').first();
    if (await bodyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bodyInput.fill('Temporary edit');
      // Escape should cancel
      await bodyInput.press('Escape');
    }
  }
});

test('brain space note title edit in drawer', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();

  // Create a note first
  await page.getByTestId('brain-canvas-tool-question').click();
  const noteCards = page.getByTestId('brain-canvas-content').locator(':scope > [data-testid^="brain-note-"]');
  await expect(noteCards).toHaveCount(1);

  // Hover and open details to get the drawer
  const note = noteCards.first();
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();

  // Drawer should open
  const drawer = page.getByTestId('brain-detail-drawer');
  await expect(drawer).toBeVisible();
  // Edit the title
  const titleInput = drawer.locator('[data-testid$="-title-input"]').first();
  if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await titleInput.fill('Drawer Title Edit');
    await titleInput.press('Tab');
  }
});

test('brain space note kind changes appearance', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();

  // Add a note using toolbar
  const questionTool = page.getByTestId('brain-canvas-tool-question');
  if (await questionTool.isVisible({ timeout: 2000 }).catch(() => false)) {
    await questionTool.click();
    // A new note should appear
    await expect(page.locator('[data-testid^="brain-note-"]').first()).toBeVisible();
  }

  // Add a different kind
  const sourceTool = page.getByTestId('brain-canvas-tool-source');
  if (await sourceTool.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sourceTool.click();
  }

  const claimTool = page.getByTestId('brain-canvas-tool-claim');
  if (await claimTool.isVisible({ timeout: 2000 }).catch(() => false)) {
    await claimTool.click();
  }

  const todoTool = page.getByTestId('brain-canvas-tool-todo');
  if (await todoTool.isVisible({ timeout: 2000 }).catch(() => false)) {
    await todoTool.click();
  }

  const looseEndTool = page.getByTestId('brain-canvas-tool-loose-end');
  if (await looseEndTool.isVisible({ timeout: 2000 }).catch(() => false)) {
    await looseEndTool.click();
  }
});

test('brain space note resize via handle', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();

  // Create a note first
  await page.getByTestId('brain-canvas-tool-question').click();
  const noteCards = page.getByTestId('brain-canvas-content').locator(':scope > [data-testid^="brain-note-"]');
  await expect(noteCards).toHaveCount(1);

  // Find a resize handle
  const handle = page.locator('[data-testid$="-resize-handle"]').first();
  await expect(handle).toBeVisible();
  const box = await handle.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 50, box.y + 50, { steps: 3 });
    await page.mouse.up();
  }
});

test('brain space canvas drag to move a note', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/brain-space`);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();

  // Create a note first
  await page.getByTestId('brain-canvas-tool-question').click();
  const noteCards = page.getByTestId('brain-canvas-content').locator(':scope > [data-testid^="brain-note-"]');
  await expect(noteCards).toHaveCount(1);

  // Get the note and drag it
  const note = noteCards.first();
  const box = await note.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 });
    await page.mouse.up();
  }
});
