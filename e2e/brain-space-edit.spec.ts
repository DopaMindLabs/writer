import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const addNote = async (page: Page) => {
  await page.goto(`/#/s/${await getFirstSpaceIdFromHome(page)}/dump`);
  const notes = page
    .getByTestId('brain-canvas')
    .locator(':scope > [data-testid^="brain-note-"]');
  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(notes).toHaveCount(1);
  return notes.first();
};

test('brain note inline title edit saves and re-renders', async ({ page }) => {
  const note = await addNote(page);
  await note.hover();
  await note.locator('[data-testid$="-add-title"]').click();
  const input = note.locator('[data-testid$="-title-input"]');
  await input.fill('My Idea');
  await input.press('Enter');
  await expect(note.locator('[data-testid$="-title"]')).toHaveText('My Idea');
});

test('brain note inline body edit saves and re-renders', async ({ page }) => {
  const note = await addNote(page);
  await note.locator('[data-testid$="-body"]').click();
  const input = note.locator('[data-testid$="-body-input"]');
  await input.fill('A passing thought');
  await input.blur();
  await expect(note.locator('[data-testid$="-body"]')).toContainText(
    'A passing thought',
  );
});
