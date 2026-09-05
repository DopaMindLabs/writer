import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import JSZip from 'jszip';
import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

const BIB = `@article{rx1, author = {Author, A.}, title = {First Ref}, year = {2020}}
@book{rx2, title = {Second Ref}, year = {2021}}`;

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/1eHAAAAAElFTkSuQmCC';

const pngPayload = (name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(PNG_1PX, 'base64'),
});

/**
 * Seed annotations and a highlight palette straight into IndexedDB: both
 * tables ship in the schema and render into the export, but neither has an
 * authoring surface yet, so the populated branches of the projection cannot be
 * reached through the UI alone.
 */
const seedAnnotationsAndPalette = (
  page: Page,
  options: { spaceId: string; docId: string },
): Promise<void> =>
  page.evaluate(
    ({ spaceId, docId }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lipsum');
        open.onerror = () => reject(new Error('could not open lipsum db'));
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['annotations', 'palettes'], 'readwrite');
          const meta = {
            accessScopeId: spaceId,
            createdBy: 'me',
            updatedBy: 'me',
            mutationId: 'op-export-seed',
            logicalUpdatedAt: { millis: 1, counter: 0 },
          };
          tx.objectStore('annotations').put({
            ...meta,
            id: 'ann-1',
            docId,
            rangeStart: 0,
            rangeEnd: 12,
            kind: 'highlight',
            color: 'yellow',
            body: 'worth keeping\nacross lines',
            author: 'me',
            createdAt: 1,
          });
          tx.objectStore('annotations').put({
            ...meta,
            id: 'ann-2',
            docId,
            rangeStart: 20,
            rangeEnd: 25,
            kind: 'side',
            author: 'me',
            createdAt: 2,
          });
          tx.objectStore('palettes').put({
            ...meta,
            id: 'palette-1',
            spaceId,
            slots: [
              { name: 'Key idea', color: '#ffd166' },
              { name: 'Question', color: '#118ab2' },
            ],
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(new Error('could not seed annotations and palette'));
          };
        };
      }),
    options,
  );

test('projects connections, annotations, palette and picture assets into the zip', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const spaceId = await getFirstSpaceIdFromHome(page);

  await page.goto(`/#/s/${spaceId}/brain-space`);
  const notes = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]');
  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(notes).toHaveCount(1);
  const first = notes.first();
  await first.hover();
  await first.locator('[data-testid$="-add-title"]').click();
  await first.locator('[data-testid$="-title-input"]').fill('From here');
  await first.locator('[data-testid$="-title-input"]').press('Enter');

  // Two pictures with one name force the asset dedupe.
  await first.hover();
  await first.locator('[data-testid$="-open-details"]').click();
  const drawer = page.getByTestId('brain-detail-drawer');
  await expect(drawer).toBeVisible();
  const input = drawer.getByTestId('brain-detail-drawer-attachments-input');
  await input.setInputFiles(pngPayload('figure.png'));
  await expect(drawer.getByRole('img', { name: 'figure.png' })).toBeVisible();
  await input.setInputFiles(pngPayload('figure.png'));
  await expect(drawer.getByRole('img', { name: 'figure.png' })).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();

  // The third picture rides an image card: its drop zone takes files without
  // any hover or drawer, so overlapping fresh cards cannot misroute it.
  await page.getByTestId('brain-canvas-tool-image').click();
  await expect(notes).toHaveCount(2);
  // By feature, not position: the canvas does not promise render order, and
  // only the image card carries a drop zone.
  const dropzone = page.locator('[data-testid$="-image-dropzone-input"]');
  await expect(dropzone).toHaveCount(1);
  await dropzone.setInputFiles(pngPayload('photo.png'));
  await expect(page.locator('[data-testid$="-image-primary"]')).toBeVisible();

  // Shift-pick links the two notes; the projection names both ends.
  await notes.first().dispatchEvent('pointerdown', { shiftKey: true, button: 0 });
  await notes.last().dispatchEvent('pointerdown', { shiftKey: true, button: 0 });

  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/([^/?#]+)/);
  const docId = /\/d\/([^/?#]+)/.exec(page.url())?.[1];
  expect(docId).toBeTruthy();
  await seedAnnotationsAndPalette(page, { spaceId, docId: docId ?? '' });

  await page
    .locator('aside')
    .last()
    .getByTestId('sidebar-space-menu-trigger')
    .click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('space-menu-popover-export').click();
  const download = await downloadPromise;
  const path = await download.path();
  const zip = await JSZip.loadAsync(readFileSync(path));

  const connections = await zip.file('connections.md')?.async('string');
  expect(connections).toContain('From here');
  expect(connections).toContain('→');

  const annotations = await zip.file('annotations.md')?.async('string');
  expect(annotations).toContain('**highlight**');
  expect(annotations).toContain('· yellow');
  expect(annotations).toContain('> worth keeping across lines');
  expect(annotations).toContain('**side**');

  const palette = await zip.file('palette.md')?.async('string');
  expect(palette).toContain('1. Key idea — `#ffd166`');
  expect(palette).toContain('2. Question — `#118ab2`');

  const assets = Object.keys(zip.files).filter((name) => name.includes('assets'));
  expect(assets.some((name) => name.endsWith('figure.png'))).toBe(true);
  expect(assets.some((name) => name.endsWith('figure-2.png'))).toBe(true);
  expect(assets.some((name) => name.endsWith('photo.png'))).toBe(true);
});

test('exports a space populated with citations and notes', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await page.goto(`/#/s/${spaceId}/citations`);
  await page.getByTestId('citations-add-toggle').click();
  await page.getByTestId('citations-manual-add-input').fill(BIB);
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(page.getByTestId('citations-status')).toContainText(/imported/i);

  await page.goto(`/#/s/${spaceId}/brain-space`);
  const notes = page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]');

  await page.getByTestId('brain-canvas-tool-question').click();
  await expect(notes).toHaveCount(1);
  const titled = notes.first();
  await titled.hover();
  await titled.locator('[data-testid$="-add-title"]').click();
  await titled.locator('[data-testid$="-title-input"]').fill('A titled note');
  await titled.locator('[data-testid$="-title-input"]').press('Enter');

  await page.getByTestId('brain-canvas-tool-source').click();
  await expect(notes).toHaveCount(2);
  const bodyOnly = notes.nth(1);
  await bodyOnly.locator('[data-testid$="-body"]').click();
  await bodyOnly.locator('[data-testid$="-body-input"]').fill('Body only note');
  await bodyOnly.locator('[data-testid$="-body-input"]').blur();

  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  await page
    .locator('aside')
    .last()
    .getByTestId('sidebar-space-menu-trigger')
    .click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('space-menu-popover-export').click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.zip$/);
});
