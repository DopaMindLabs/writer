import { test, expect } from './_helpers';
import { reseedAndGoHome, createSpaceFromTemplate } from './_helpers';

// Long, theme-based journey across every *creatable* template: each one creates
// a usable space whose drafted content persists to the local drive (IndexedDB)
// across a hard reload. One scenario per template keeps failures isolated.
//
// Covers every template the picker offers (those with `enabled: true` in
// src/data/templates/*). `bioinformatics` and `six` are `enabled: false` — they
// have no picker card and cannot be created through the UI, so they are omitted.
const TEMPLATE_IDS = [
  'blank',
  'fiction',
  'humanities',
  'journal',
  'serial',
  'technical',
] as const;

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test.describe('Workflow: every template drafts and persists', () => {
  for (const id of TEMPLATE_IDS) {
    test(`drafts and persists across a reload: ${id}`, async ({ page }) => {
      const probe = `${id}-probe-${Date.now()}`;

      await test.step(`Given a new space is created from the ${id} template`, async () => {
        await createSpaceFromTemplate(page, id, { name: `${id} space`, tag: 'TPL' });
        await expect(page.locator('[aria-label="Document body"]')).toBeVisible();
      });

      await test.step('When the writer drafts a probe and autosave flushes', async () => {
        const editor = page.locator('[aria-label="Document body"]');
        await editor.click();
        await page.keyboard.type(probe);
        await expect(editor).toContainText(probe);
        // Autosave debounce is 600ms — wait long enough for it to flush to IndexedDB.
        await page.waitForTimeout(1000);
      });

      await test.step('Then the probe rehydrates from the local drive after a hard reload', async () => {
        await page.reload();
        await expect(page.locator('[aria-label="Document body"]')).toContainText(
          probe,
        );
      });
    });
  }
});
