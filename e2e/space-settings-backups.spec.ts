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
 * Populates a space with content across every archivable table — revisions
 * (via the auto-revision system on doc edit), a doc-inspector config (via the
 * space's Doc inspector tab), and a note attachment (via the brain canvas).
 * Used to make snapshot/restore/import end-to-end coverage exercise every
 * codec parser.
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

  await page.goto(`/#/s/${spaceId}/dump`);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();
  await page.getByTestId('brain-canvas-tool-question').click();
  const note = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]')
    .first();
  await note.hover();
  await note.locator('[data-testid$="-open-details"]').click();
  const drawer = page.getByTestId('brain-detail-drawer');
  await expect(drawer).toBeVisible();
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

test('backups tab: snapshot adds a row that can be downloaded and deleted', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings?tab=backups`);

  const snapDownload = page.waitForEvent('download');
  await page.getByTestId('space-settings-backups-snapshot').click();
  await snapDownload;

  const history = page.getByTestId('backups-history');
  await expect(history).toBeVisible();

  const rowDownload = page.waitForEvent('download');
  await history.locator('[data-testid$="-download"]').first().click();
  await rowDownload;

  page.once('dialog', (d) => void d.accept());
  await history.locator('[data-testid$="-delete"]').first().click();
  await expect(page.getByTestId('backups-history')).toHaveCount(0);
});

test('backups tab: restoring a snapshot rolls the space back and keeps a pre-restore snapshot', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  // Populate every archivable table before snapshotting so the round-trip
  // exercises every codec parser, including attachments, revisions, and the
  // doc-inspector config.
  await enrichSpace(page, spaceId);

  await page.goto(`/#/s/${spaceId}/settings?tab=backups`);
  const snapDownload = page.waitForEvent('download');
  await page.getByTestId('space-settings-backups-snapshot').click();
  await snapDownload;
  await expect(page.getByTestId('backups-history')).toBeVisible();

  await page.goto(`/#/s/${spaceId}/settings?tab=general`);
  const nameInput = page.getByTestId('space-settings-name-input');
  const originalName = await nameInput.inputValue();
  await nameInput.fill('Renamed After Snapshot');
  await nameInput.press('Enter');

  await page.goto(`/#/s/${spaceId}/settings?tab=backups`);
  const history = page.getByTestId('backups-history');
  await history.locator('[data-testid$="-restore"]').first().click();
  await page.getByTestId('restore-backup-dialog-confirm').click();
  await expect(page.getByText(/snapshot restored/i)).toBeVisible();

  await expect(
    history.locator('tbody tr').filter({ hasText: 'snapshot' }),
  ).toHaveCount(1);

  await page.goto(`/#/s/${spaceId}/settings?tab=general`);
  await expect(page.getByTestId('space-settings-name-input')).toHaveValue(
    originalName,
  );

  // Attachment from before the snapshot must survive the restore — proves
  // bindAttachmentBlobs round-tripped the image bytes.
  await page.goto(`/#/s/${spaceId}/dump`);
  await expect(page.getByRole('img', { name: 'cover.png' })).toBeVisible();
});
