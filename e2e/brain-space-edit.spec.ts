import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const addNote = async (page: Page) => {
  await page.goto(`/#/s/${await getFirstSpaceIdFromHome(page)}/dump`);
  const notes = page
    .getByTestId('brain-canvas-content')
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

test('a card added while scrolled away lands in the visible viewport', async ({
  page,
}) => {
  const first = await addNote(page);

  const box = (await first.boundingBox())!;
  const vp = page.viewportSize()!;
  await page.mouse.move(box.x + box.width / 2, box.y + 6);
  await page.mouse.down();
  await page.mouse.move(vp.width - 30, vp.height - 30, { steps: 14 });
  await page.mouse.up();

  const scroll = page.getByTestId('brain-canvas-scroll');
  await scroll.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
    el.scrollTop = el.scrollHeight;
  });
  const offset = await scroll.evaluate((el) => ({
    l: el.scrollLeft,
    t: el.scrollTop,
  }));
  expect(offset.l).toBeGreaterThan(0);
  expect(offset.t).toBeGreaterThan(0);

  const cards = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]');
  const idsBefore = await cards.evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-testid')),
  );

  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(cards).toHaveCount(idsBefore.length + 1);

  const newTestId = (
    await cards.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-testid')),
    )
  ).find((id) => id !== null && !idsBefore.includes(id));
  expect(newTestId).toBeTruthy();

  const view = (await scroll.boundingBox())!;
  const card = (await page.getByTestId(newTestId!).boundingBox())!;
  expect(card.x).toBeGreaterThanOrEqual(view.x - 1);
  expect(card.y).toBeGreaterThanOrEqual(view.y - 1);
  expect(card.x + card.width).toBeLessThanOrEqual(view.x + view.width + 1);
  expect(card.y + card.height).toBeLessThanOrEqual(view.y + view.height + 1);
});
