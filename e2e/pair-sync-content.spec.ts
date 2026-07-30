import { test, expect } from './_helpers';
import {
  openCoveredContext,
  reseedAndGoHome,
  getFirstSpaceIdFromHome,
} from './_helpers';
import { pair } from './_pairing';

/**
 * Content inside a space, not just the space itself.
 *
 * `pair-sync.spec.ts` proves that spaces and documents appear on the other
 * device — enough to show a pairing works at all, and it passes while the things
 * a user actually writes stay put. A brain-space note is an ordinary synced row,
 * so it and the text inside it should cross with the far canvas already on
 * screen, without anyone reopening anything.
 */

const SYNC_TIMEOUT = 30_000;

const noteCards = (page: Awaited<ReturnType<typeof openCoveredContext>>) =>
  page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]');

test('a note written after pairing reaches the other device', async ({
  page,
  browser,
  browserName,
}) => {
  const second = await openCoveredContext(browser, browserName);
  await reseedAndGoHome(page);
  // Read before pairing: pairing leaves this device in settings, not at home.
  const spaceId = await getFirstSpaceIdFromHome(page);
  await second.goto('/#/');

  await pair(page, second);
  await expect(second.locator('[data-testid^="space-rail-space-"]').first()).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });

  await page.goto(`/#/s/${spaceId}/brain-space`);
  await expect(page.getByTestId('brain-canvas-toolbar')).toBeVisible();
  const before = await noteCards(page).count();
  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(noteCards(page)).toHaveCount(before + 1);

  // The second device is already sitting on the canvas, so nothing here
  // remounts: the note must arrive on the live query, not on a revisit.
  await second.goto(`/#/s/${spaceId}/brain-space`);
  await expect(second.getByTestId('brain-canvas-toolbar')).toBeVisible();
  await expect(noteCards(second)).toHaveCount(before + 1, { timeout: SYNC_TIMEOUT });

  // And what is written *in* it, with the far canvas already on screen.
  const note = noteCards(page).last();
  const noteId = await note.getAttribute('data-testid');
  const id = String(noteId).replace(/^brain-note-/, '');
  await note.getByTestId(`brain-note-${id}-body`).click();
  await page.getByTestId(`brain-note-${id}-body-input`).fill('Written on the far side');
  await page.getByTestId(`brain-note-${id}-body-input`).blur();

  await expect(
    second.getByTestId(`brain-note-${id}-body`),
  ).toContainText('Written on the far side', { timeout: SYNC_TIMEOUT });
});
