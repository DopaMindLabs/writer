import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';
import { Buffer } from 'node:buffer';

const CITATION_A = `@article{wfSmith2021,
  author = {Smith, Jane},
  title  = {Workflow Edit Subject},
  year   = {2021},
}`;

const FILE_BIB = `@book{wfBook, author = {Doe, Jane}, title = {Imported Book}, year = {2019}}
@article{wfArt, author = {Roe, Richard}, title = {Imported Article}, year = {2020}}`;

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test.describe('Workflow: building a bibliography', () => {
  test('add, import, search, edit, reject duplicate, bulk-delete, and export', async ({
    page,
  }) => {
    const spaceId = await getFirstSpaceIdFromHome(page);
    await page.goto(`/#/s/${spaceId}/citations`);

    await test.step('Given the writer adds a BibTeX entry manually', async () => {
      await page.getByTestId('citations-add-toggle').click();
      await page.getByTestId('citations-manual-add-input').fill(CITATION_A);
      await page.getByTestId('citations-manual-add-submit').click();
      await expect(page.getByTestId('citations-status')).toContainText(
        /imported 1 citation/i,
      );
    });

    await test.step('When they import a .bib file', async () => {
      await page.getByTestId('citations-file-input').setInputFiles({
        name: 'refs.bib',
        mimeType: 'application/x-bibtex',
        buffer: Buffer.from(FILE_BIB),
      });
      await expect(page.getByTestId('citations-status')).toContainText(
        /imported 2 citations/i,
      );
    });

    await test.step('And they search, see the empty state, then clear', async () => {
      await page.getByTestId('citations-search').fill('zzznomatch');
      await expect(page.getByText(/no rows match your search/i)).toBeVisible();
      await page.getByTestId('citations-search-clear').click();
      await expect(page.getByText('wfSmith2021').first()).toBeVisible();
    });

    await test.step('And a duplicate tag is rejected when editing', async () => {
      await page
        .getByRole('button', { name: 'View citation wfSmith2021' })
        .click();
      const detail = page.locator('div[data-testid^="citation-detail-"]');
      await expect(detail).toBeVisible();
      await detail.getByRole('button', { name: 'edit' }).click();
      const editor = page.locator('div[data-testid^="citation-edit-"]');
      await editor.getByLabel('Tag').fill('wfBook');
      await editor.getByLabel('Title').press('ControlOrMeta+Enter');
      await expect(page.getByRole('status')).toContainText(
        /already used in this space/i,
      );
    });

    await test.step('Then a valid edit saves', async () => {
      const editor = page.locator('div[data-testid^="citation-edit-"]');
      await editor.getByLabel('Tag').fill('wfSmith2021v2');
      await editor.getByRole('button', { name: /^save$/ }).click();
      await expect(page.getByRole('status')).toContainText(/Updated 1 citation/i);
      await expect(page.getByText('wfSmith2021v2').first()).toBeVisible();
    });

    await test.step('And they bulk-select all and delete via the confirm dialog', async () => {
      await page
        .getByRole('checkbox', { name: 'Select all citations on this page' })
        .check();
      const bulkBar = page.getByRole('region', { name: /Bulk actions/i });
      await expect(bulkBar).toBeVisible();
      page.once('dialog', (d) => void d.accept());
      await bulkBar.getByRole('button', { name: /^delete$/ }).click();
      await expect(page.getByRole('status')).toContainText(/Deleted 3 citations/i);
      await expect(page.getByText(/no citations yet/i)).toBeVisible();
    });

    await test.step('And re-adding one citation lets them export a .bib file', async () => {
      await page.getByTestId('citations-add-toggle').click();
      await page.getByTestId('citations-manual-add-input').fill(CITATION_A);
      await page.getByTestId('citations-manual-add-submit').click();
      await expect(page.getByTestId('citations-status')).toContainText(
        /imported 1 citation/i,
      );
      const downloadPromise = page.waitForEvent('download');
      await page.getByTestId('citations-export').click();
      expect((await downloadPromise).suggestedFilename()).toMatch(/\.bib$/);
    });
  });
});
