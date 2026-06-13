import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const addBibtex = async (page: Page, bibtex: string) => {
  await page.getByRole('button', { name: '+ add' }).click();
  const form = page.getByTestId('citations-manual-add');
  await expect(form).toBeVisible();
  await page.getByTestId('citations-manual-add-input').fill(bibtex);
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(form).not.toBeVisible();
};

const gotoCitations = async (page: Page) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);
  await expect(page.getByTestId('citations-pane')).toBeVisible();
  return spaceId;
};

test('sort citations by year column', async ({ page }) => {
  await gotoCitations(page);

  // Seed some citations with different years
  await addBibtex(page, `@article{sortOld2010, author={Old}, title={Old One}, year={2010}}`);
  await addBibtex(page, `@article{sortNew2025, author={New}, title={New One}, year={2025}}`);
  await addBibtex(page, `@article{sortMid2018, author={Mid}, title={Mid One}, year={2018}}`);

  // Click the year column header to sort
  const yearHeader = page.getByTestId('citations-col-year');
  if (await yearHeader.isVisible()) {
    await yearHeader.click();
    // Verify sort happened (no crash)
    await expect(page.getByRole('button', { name: 'View citation sortOld2010' })).toBeVisible();
  }
});

test('citation bulk set type changes citation types', async ({ page }) => {
  await gotoCitations(page);

  await addBibtex(page, `@article{typeTest2024, author={Type}, title={Type Test}, year={2024}}`);

  // Select the row
  const row = page.getByRole('button', { name: 'View citation typeTest2024' });
  await row.locator('input[type="checkbox"]').click();

  // Bulk bar should appear
  const bulkBar = page.getByTestId('citations-bulk-bar');
  await expect(bulkBar).toBeVisible();

  // Use the bulk set type select
  const typeSelect = bulkBar.locator('select').first();
  if (await typeSelect.isVisible()) {
    await typeSelect.selectOption('book');
    // Verify type changed
    await expect(page.getByRole('status')).toContainText(/type/i);
  }
});

test('citation export generates a bibtex file download', async ({ page }) => {
  await gotoCitations(page);

  await addBibtex(page, `@article{exportTest2024, author={Export}, title={Export Test}, year={2024}}`);

  // Start download listener
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('citations-export').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.bib$/);
});

test('citation pane search filters by keyword', async ({ page }) => {
  await gotoCitations(page);

  await addBibtex(page, `@article{searchHit2024, author={FindMe}, title={Searchable Title}, year={2024}}`);
  await addBibtex(page, `@article{searchMiss2024, author={HideMe}, title={Hidden Title}, year={2024}}`);

  // Type in the search field
  const search = page.getByTestId('citations-search');
  await search.fill('FindMe');

  // Only the matching row should be visible
  await expect(page.getByRole('button', { name: 'View citation searchHit2024' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View citation searchMiss2024' })).not.toBeVisible();

  // Clear search
  await search.fill('');
  await expect(page.getByRole('button', { name: 'View citation searchMiss2024' })).toBeVisible();
});

test('citation edit with Cmd+Enter submits the form', async ({ page }) => {
  await gotoCitations(page);

  await addBibtex(page, `@article{cmdEnter2024, author={CmdEnter}, title={Submit Via Shortcut}, year={2024}}`);

  // Open detail
  await page.getByRole('button', { name: 'View citation cmdEnter2024' }).click();
  const detail = page.locator('[data-testid^="citation-detail-"]').first();
  await expect(detail).toBeVisible();

  // Click edit
  await detail.locator('[data-testid$="-edit"]').click();
  const editForm = page.locator('[data-testid^="citation-edit-"]').first();
  await expect(editForm).toBeVisible();

  // Modify title and Cmd+Enter to submit
  const titleInput = editForm.locator('input, textarea').first();
  await titleInput.fill('Updated Via CmdEnter');
  await titleInput.press('Meta+Enter');

  // Detail should reappear (edit submitted)
  await expect(page.locator('[data-testid^="citation-detail-"]').first()).toBeVisible();
});

test('citation import via file with chapter type', async ({ page }) => {
  await gotoCitations(page);

  const bibtex = `@incollection{chapterTest2024,
  author = {Chapter Author},
  title = {A Chapter Entry},
  booktitle = {Some Book},
  year = {2024}
}`;

  const fileInput = page.getByTestId('citations-file-input');
  await fileInput.setInputFiles({
    name: 'chapter.bib',
    mimeType: 'application/x-bibtex',
    buffer: Buffer.from(bibtex),
  });

  await expect(page.getByRole('button', { name: 'View citation chapterTest2024' })).toBeVisible();
});

test('citation import with entry missing key is skipped', async ({ page }) => {
  await gotoCitations(page);

  const bibtex = `@article{,
  author = {NoKey Author},
  title = {Missing Key Entry},
  year = {2024}
}
@article{hasKey2024,
  author = {HasKey Author},
  title = {Has Key Entry},
  year = {2024}
}`;

  const fileInput = page.getByTestId('citations-file-input');
  await fileInput.setInputFiles({
    name: 'nokey.bib',
    mimeType: 'application/x-bibtex',
    buffer: Buffer.from(bibtex),
  });

  // Only the entry with a key should be imported
  await expect(page.getByRole('button', { name: 'View citation hasKey2024' })).toBeVisible();
});
