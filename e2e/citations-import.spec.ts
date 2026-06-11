import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';
import { Buffer } from 'node:buffer';

const DIVERSE_BIB = `@book{cvBook, author = {Doe, Jane and Roe, Richard}, title = {A Book}, year = {2019}}
@inproceedings{cvConf, author = {Smith, Alan}, title = {Conf Paper}, year = {2020}}
@incollection{cvChap, author = {Mononym, M.}, title = {A Chapter}, date = {2021-06}}
@misc{cvMisc, title = {Misc Only}}
@phdthesis{cvThesis, author = {Roe, Bo}, year = {2022}}`;

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('citations import diverse BibTeX types and export them back to .bib', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await page.getByTestId('citations-add-toggle').click();
  await page.getByTestId('citations-manual-add-input').fill(DIVERSE_BIB);
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(page.getByTestId('citations-status')).toContainText(
    /imported 5 citations/i,
  );

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('citations-export').click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.bib$/);
});

test('citations file upload imports entries and reports duplicate skips', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  const file = {
    name: 'refs.bib',
    mimeType: 'application/x-bibtex',
    buffer: Buffer.from(DIVERSE_BIB),
  };

  await page.getByTestId('citations-file-input').setInputFiles(file);
  await expect(page.getByTestId('citations-status')).toContainText(
    /imported 5 citations/i,
  );

  await page.getByTestId('citations-file-input').setInputFiles(file);
  await expect(page.getByTestId('citations-status')).toContainText(
    /imported 0 citations, skipped 5 duplicates/i,
  );
});

test('citations selection toggles per-row and select-all on/off', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await page.getByTestId('citations-add-toggle').click();
  await page.getByTestId('citations-manual-add-input').fill(DIVERSE_BIB);
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(page.getByTestId('citations-status')).toContainText(/imported/i);

  await page.getByTestId('citations-select-all').click();
  await expect(page.getByTestId('citations-bulk-bar')).toBeVisible();
  await page.getByTestId('citations-select-all').click();
  await expect(page.getByTestId('citations-bulk-bar')).toHaveCount(0);

  const firstSelect = page
    .locator('[data-testid^="citation-row-"][data-testid$="-select"]')
    .first();
  await firstSelect.click();
  await expect(page.getByTestId('citations-bulk-bar')).toBeVisible();
  await firstSelect.click();
  await expect(page.getByTestId('citations-bulk-bar')).toHaveCount(0);
});
