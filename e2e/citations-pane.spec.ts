import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

const CITATION_A = `@article{paneSmith2021,
  author = {Smith, Jane},
  title  = {Pane Edit Subject},
  year   = {2021},
}`;

const CITATION_B = `@book{paneJones2022,
  author = {Jones, Bob},
  title  = {Pane Bulk Subject},
  year   = {2022},
}`;

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

async function addBibtex(page: Page, bibtex: string): Promise<void> {
  await page.getByRole('button', { name: '+ add' }).click();
  await page.getByPlaceholder(/@article\{/).fill(bibtex);
  await page.getByRole('button', { name: /add citation/i }).click();
  await expect(page.getByRole('status')).toContainText(/Imported \d+ citation/i);
}

test('expand a citation, edit it via Cmd+Enter, and reject duplicate tags', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await addBibtex(page, CITATION_A);
  await addBibtex(page, CITATION_B);

  await page.getByRole('button', { name: 'View citation paneSmith2021' }).click();
  const detail = page.locator('[data-testid^="citation-detail-"]');
  await expect(detail).toBeVisible();
  await expect(detail.getByText('Pane Edit Subject')).toBeVisible();

  await detail.getByRole('button', { name: 'edit' }).click();
  const editor = page.locator('[data-testid^="citation-edit-"]');
  await expect(editor).toBeVisible();

  await editor.getByLabel('Tag').fill('paneJones2022');
  await editor.getByLabel('Title').fill('Renamed Subject');
  await editor.getByLabel('Title').press('ControlOrMeta+Enter');
  await expect(page.getByRole('status')).toContainText(
    /already used in this space/i,
  );

  await editor.getByLabel('Tag').fill('paneSmith2021v2');
  await editor.getByLabel('Year').fill('2025');
  await editor.getByLabel('Type').selectOption('book');
  await editor.getByRole('button', { name: /^save$/ }).click();

  await expect(page.getByRole('status')).toContainText(/Updated 1 citation/i);
  await expect(page.getByText('paneSmith2021v2').first()).toBeVisible();
  await expect(page.getByText('Renamed Subject').first()).toBeVisible();

  const updatedDetail = page.locator('[data-testid^="citation-detail-"]');
  await updatedDetail
    .getByRole('button', { name: /Collapse citation paneSmith2021v2/ })
    .click();
  await expect(updatedDetail).toHaveCount(0);
});

test('Escape cancels an in-progress citation edit without saving', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await addBibtex(page, CITATION_A);

  await page.getByRole('button', { name: 'View citation paneSmith2021' }).click();
  await page
    .locator('[data-testid^="citation-detail-"]')
    .getByRole('button', { name: 'edit' })
    .click();

  const editor = page.locator('[data-testid^="citation-edit-"]');
  await editor.getByLabel('Title').fill('Should Not Persist');
  await editor.getByLabel('Title').press('Escape');

  await expect(editor).toHaveCount(0);
  await expect(page.getByText('Pane Edit Subject').first()).toBeVisible();
  await expect(page.getByText('Should Not Persist')).toHaveCount(0);
});

test('bulk-selects citations, sets type, and bulk-deletes via confirm dialog', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await addBibtex(page, CITATION_A);
  await addBibtex(page, CITATION_B);

  const bulkBar = page.getByRole('region', { name: /Bulk actions/i });
  await expect(bulkBar).toHaveCount(0);

  await page
    .getByRole('checkbox', { name: 'Select all citations on this page' })
    .check();
  await expect(bulkBar).toBeVisible();
  await expect(bulkBar).toContainText(/2 selected/i);

  await bulkBar
    .getByLabel(/Set type for selected citations/i)
    .selectOption('chapter');
  await expect(page.getByRole('status')).toContainText(
    /Set type to chapter on 2 citations/i,
  );

  page.once('dialog', (d) => void d.accept());
  await bulkBar.getByRole('button', { name: /^delete$/ }).click();
  await expect(page.getByRole('status')).toContainText(/Deleted 2 citations/i);
  await expect(page.getByText(/no citations yet/i)).toBeVisible();
  await expect(bulkBar).toHaveCount(0);
});

test('bulk-bar clear button deselects without deleting', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await addBibtex(page, CITATION_A);
  await page.getByRole('checkbox', { name: 'Select citation paneSmith2021' }).check();

  const bulkBar = page.getByRole('region', { name: /Bulk actions/i });
  await expect(bulkBar).toBeVisible();
  await bulkBar.getByRole('button', { name: /^clear$/ }).click();

  await expect(bulkBar).toHaveCount(0);
  await expect(page.getByText('paneSmith2021').first()).toBeVisible();
});

test('manual add accepts a plain title (non-BibTeX) and creates a misc citation', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await page.getByRole('button', { name: '+ add' }).click();
  await page.getByPlaceholder(/@article\{/).fill('A free-form citation title');
  await page.getByRole('button', { name: /add citation/i }).click();

  await expect(page.getByRole('status')).toContainText(/Added 1 citation/i);
  await expect(
    page.getByRole('button', { name: /View citation manual-/ }),
  ).toBeVisible();
});
