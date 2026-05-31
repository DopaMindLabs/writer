import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

// Long, theme-based journey: capturing ideas in the brain space — adding notes
// from the toolbar, editing a note inline, enriching it in the detail drawer,
// and confirming the sidebar reflects the non-empty note count.
test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test.describe('Workflow: capturing ideas in the brain space', () => {
  test('add notes, edit one inline, enrich it in the drawer, and reflect the sidebar count', async ({
    page,
  }) => {
    const spaceId = await getFirstSpaceIdFromHome(page);
    const canvas = page.getByTestId('brain-canvas');
    const noteCards = page.getByTestId('brain-canvas-content').locator(':scope > [data-testid^="brain-note-"]');

    await test.step('Given the writer opens the brain space', async () => {
      await page.goto(`/#/s/${spaceId}/dump`);
      await expect(canvas).toBeVisible();
      await expect(page.getByTestId('brain-canvas-toolbar')).toBeVisible();
    });

    await test.step('When they add two notes from the toolbar', async () => {
      await page.getByTestId('brain-canvas-tool-question').click();
      await expect(noteCards).toHaveCount(1);
      await page.getByTestId('brain-canvas-tool-question').click();
      await expect(noteCards).toHaveCount(2);
    });

    await test.step('And they edit a note title inline', async () => {
      // Operate on the most-recently-added note: canvas notes are absolutely
      // positioned and overlap, so the last one is painted on top (not occluded).
      const note = noteCards.last();
      await note.hover();
      await note.locator('[data-testid$="-add-title"]').click();
      const input = note.locator('[data-testid$="-title-input"]');
      await input.fill('Hypothesis');
      await input.press('Enter');
      await expect(note.locator('[data-testid$="-title"]')).toHaveText('Hypothesis');
    });

    await test.step('And they enrich it via the detail drawer and link a doc', async () => {
      const note = noteCards.last();
      await note.hover();
      await note.locator('[data-testid$="-open-details"]').click();
      const drawer = page.getByTestId('brain-detail-drawer');
      await expect(drawer).toBeVisible();
      await page.getByTestId('brain-detail-drawer-body').fill('Refine the hypothesis');
      await page
        .getByTestId('brain-detail-drawer-linked-doc')
        .selectOption({ index: 1 });
      await expect(page.getByTestId('brain-detail-drawer-open')).toBeVisible();
    });

    await test.step('Then the sidebar brain-space link reflects the note count', async () => {
      await page.goto(`/#/s/${spaceId}`);
      await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
      await expect(
        page.getByTestId('sidebar-brain-space-link-count'),
      ).toContainText('◦');
    });
  });
});
