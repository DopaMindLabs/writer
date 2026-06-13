import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/1eHAAAAAElFTkSuQmCC';

const pngPayload = (name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(PNG_1PX, 'base64'),
});

/**
 * Same enrichment as in space-settings-backups.spec — kept inline so each
 * spec is self-contained. The point is to exercise every archive codec
 * (revisions, inspector config, attachments) through the import path too.
 */
const enrichSpace = async (page: Page, spaceId: string): Promise<void> => {
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const editor = page.locator('[aria-label="Document body"]');
  await editor.click();
  await editor.pressSequentially('Coverage seed.', { delay: 10 });

  await page.goto(`/#/s/${spaceId}/settings?tab=docInspector`);
  await page
    .getByRole('group', { name: 'Due date', exact: true })
    .getByTestId('inspector-toggle-off')
    .click();

  await page.goto(`/#/s/${spaceId}/brain-space`);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();
  const noteCards = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]');
  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(noteCards).toHaveCount(1);
  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(noteCards).toHaveCount(2);

  // Shift-pick the connection endpoints, linking the two notes. Dispatched
  // directly because freshly added cards can overlap, which makes a real
  // click fail Playwright's hit-testing.
  await noteCards
    .first()
    .dispatchEvent('pointerdown', { shiftKey: true, button: 0 });
  await noteCards
    .last()
    .dispatchEvent('pointerdown', { shiftKey: true, button: 0 });

  // The last-added card sits on top of the stack, so it is hoverable.
  const note = noteCards.last();
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();
  const drawer = page.getByTestId('brain-detail-drawer');
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByTestId('brain-detail-drawer-connections-empty'),
  ).toHaveCount(0);
  await drawer
    .getByTestId('brain-detail-drawer-attachments-input')
    .setInputFiles(pngPayload('cover.png'));
  await expect(
    drawer.getByTestId('brain-detail-drawer-attachments-count'),
  ).toHaveText('1 / 2');
  await page.getByTestId('brain-detail-drawer-close').click();
};

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('a downloaded space archive can be imported as a new space', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  // Rich snapshot so importSpaceArchive remaps every cross-reference, not
  // just the trivial space/section/doc ones.
  await enrichSpace(page, spaceId);

  await page.goto(`/#/s/${spaceId}/settings?tab=backups`);
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('space-settings-backups-snapshot').click();
  const download = await downloadPromise;
  const archivePath = await download.path();

  await page.goto('/#/settings?tab=export');
  await expect(page.getByTestId('settings-import-button')).toBeVisible();
  await page.getByTestId('settings-import-file-input').setInputFiles(archivePath);

  await page.waitForURL(
    (url) => url.hash.startsWith('#/s/') && !url.hash.includes(spaceId),
  );
  await expect(page.locator('[aria-label="Document body"]')).toBeVisible();

  // The imported attachment should be reachable from the new space's brain
  // canvas, which proves the noteAttachments codec + binding + id-remap path.
  const newSpaceMatch = page.url().match(/#\/s\/([^/?]+)/);
  if (newSpaceMatch) {
    await page.goto(`/#/s/${newSpaceMatch[1]}/brain-space`);
    await expect(page.getByRole('img', { name: 'cover.png' })).toBeVisible();
  }
});

test('importing a file that is not a space archive shows a clear error', async ({
  page,
}) => {
  await page.goto('/#/settings?tab=export');
  await expect(page.getByTestId('settings-import-button')).toBeVisible();
  await page.getByTestId('settings-import-file-input').setInputFiles({
    name: 'junk.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from('not a zip at all'),
  });

  await expect(page.getByText(/import failed/i)).toBeVisible();
});