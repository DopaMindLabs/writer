import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';
import type { Page } from '@playwright/test';

const CITATIONS = [
  `@article{testAlpha2021,
  author = {Alpha, Test},
  title = {First Entry},
  year = {2021}
}`,
  `@book{testBeta2022,
  author = {Beta, Test},
  title = {Second Entry},
  year = {2022}
}`,
  `@inproceedings{testGamma2023,
  author = {Gamma, Test},
  title = {Third Entry},
  year = {2023}
}`,
];

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const gotoCitations = async (page: Page) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);
  await expect(page.getByTestId('citations-pane')).toBeVisible();
  return spaceId;
};

const addBibtex = async (page: Page, bibtex: string) => {
  await page.getByRole('button', { name: '+ add' }).click();
  const form = page.getByTestId('citations-manual-add');
  await expect(form).toBeVisible();
  await page.getByTestId('citations-manual-add-input').fill(bibtex);
  await page.getByTestId('citations-manual-add-submit').click();
  // Wait for form to close (confirming submission completed)
  await expect(form).not.toBeVisible();
};

const seedCitations = async (page: Page) => {
  for (const bib of CITATIONS) {
    await addBibtex(page, bib);
  }
  await expect(page.locator('[data-testid^="citation-row-"]').first()).toBeVisible();
};

test('expand a citation detail view from the row', async ({ page }) => {
  await gotoCitations(page);
  await seedCitations(page);

  // Click on the first citation row to expand detail
  const row = page.locator('[data-testid^="citation-row-"]').first();
  await row.click();

  // Detail panel should be visible (uses citation-detail-{id} testid)
  const detail = page.locator('[data-testid^="citation-detail-"]').first();
  await expect(detail).toBeVisible();

  // Check detail fields are shown
  await expect(detail.locator('[data-testid$="-title"]')).toBeVisible();
  await expect(detail.locator('[data-testid$="-authors"]')).toBeVisible();
  await expect(detail.locator('[data-testid$="-year"]')).toBeVisible();
  await expect(detail.locator('[data-testid$="-type"]')).toBeVisible();
  await expect(detail.locator('[data-testid$="-tag"]')).toBeVisible();

  // Close the detail view
  await detail.locator('[data-testid$="-close"]').click();
  await expect(detail).not.toBeVisible();
});

test('edit a citation from the detail view', async ({ page }) => {
  await gotoCitations(page);
  await seedCitations(page);

  // Open detail
  const row = page.locator('[data-testid^="citation-row-"]').first();
  await row.click();
  const detail = page.locator('[data-testid^="citation-detail-"]').first();
  await expect(detail).toBeVisible();

  // Click edit
  await detail.locator('[data-testid$="-edit"]').click();

  // Edit form should be visible
  const editForm = page.locator('[data-testid^="citation-edit-"]').first();
  await expect(editForm).toBeVisible();

  // Change the title
  const titleInput = editForm.locator('[data-testid$="-title"] input, [data-testid$="-title"] textarea').first();
  if (await titleInput.isVisible()) {
    await titleInput.fill('Edited Test Title');
  }

  // Save
  await editForm.locator('[data-testid$="-save"]').click();
  // Detail view should reappear
  await expect(page.locator('[data-testid^="citation-detail-"]').first()).toBeVisible();
});

test('delete a single citation from detail view with confirmation', async ({
  page,
}) => {
  await gotoCitations(page);
  await seedCitations(page);

  // Open detail for testAlpha2021
  await page.getByRole('button', { name: 'View citation testAlpha2021' }).click();
  const detail = page.locator('[data-testid^="citation-detail-"]').first();
  await expect(detail).toBeVisible();

  // Accept the confirm dialog
  page.on('dialog', (dialog) => dialog.accept());

  // Click delete
  await detail.locator('[data-testid$="-delete"]').click();

  // The deleted citation should no longer exist
  await expect(page.getByRole('button', { name: 'View citation testAlpha2021' })).toHaveCount(0);
  // Others should still be present
  await expect(page.getByRole('button', { name: 'View citation testBeta2022' })).toBeVisible();
});

test('select multiple citations and bulk delete', async ({ page }) => {
  await gotoCitations(page);
  await seedCitations(page);

  // Select testAlpha2021 and testBeta2022 via their checkboxes
  const alphaRow = page.getByRole('button', { name: 'View citation testAlpha2021' });
  const betaRow = page.getByRole('button', { name: 'View citation testBeta2022' });
  await alphaRow.locator('input[type="checkbox"]').click();
  await betaRow.locator('input[type="checkbox"]').click();

  // Bulk bar should appear
  const bulkBar = page.getByTestId('citations-bulk-bar');
  await expect(bulkBar).toBeVisible();
  await expect(page.getByTestId('citations-bulk-bar-count')).toContainText('2');

  // Accept dialog and delete
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByTestId('citations-bulk-delete').click();

  // Deleted citations gone, remaining still present
  await expect(alphaRow).toHaveCount(0);
  await expect(betaRow).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'View citation testGamma2023' })).toBeVisible();
});

test('select all citations via header checkbox', async ({ page }) => {
  await gotoCitations(page);
  await seedCitations(page);

  // Ensure our seeded citations are visible
  await expect(page.getByRole('button', { name: 'View citation testAlpha2021' })).toBeVisible();

  // Click select-all checkbox
  await page.getByTestId('citations-select-all').click();

  // Bulk bar should appear with a count
  await expect(page.getByTestId('citations-bulk-bar')).toBeVisible();

  // Clear selection
  await page.getByTestId('citations-bulk-clear').click();
  await expect(page.getByTestId('citations-bulk-bar')).not.toBeVisible();
});

test('manually add a citation via the add form', async ({ page }) => {
  await gotoCitations(page);

  // Toggle add form
  await page.getByTestId('citations-add-toggle').click();
  const addForm = page.getByTestId('citations-manual-add');
  await expect(addForm).toBeVisible();

  // Fill the input (bibtex)
  await page.getByTestId('citations-manual-add-input').fill(`@article{newkey2026,
  author = {New, Author},
  title = {Newly Added},
  year = {2026}
}`);
  await page.getByTestId('citations-manual-add-submit').click();

  // Row should appear
  await expect(page.locator('[data-testid^="citation-row-"]').first()).toBeVisible();
});

test('cancel manual add form hides it', async ({ page }) => {
  await gotoCitations(page);

  await page.getByTestId('citations-add-toggle').click();
  await expect(page.getByTestId('citations-manual-add')).toBeVisible();

  await page.getByTestId('citations-manual-add-cancel').click();
  await expect(page.getByTestId('citations-manual-add')).not.toBeVisible();
});

test('export citations as bibtex file', async ({ page }) => {
  await gotoCitations(page);
  await seedCitations(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('citations-export').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.bib$/);
});

test('citation row keyboard Enter expands detail', async ({ page }) => {
  await gotoCitations(page);
  await seedCitations(page);

  const row = page.locator('[data-testid^="citation-row-"]').first();
  await row.focus();
  await row.press('Enter');

  const detail = page.locator('[data-testid^="citation-detail-"]').first();
  await expect(detail).toBeVisible();
});

test('edit form cancel returns to detail view', async ({ page }) => {
  await gotoCitations(page);
  await seedCitations(page);

  // Open detail then edit
  const row = page.locator('[data-testid^="citation-row-"]').first();
  await row.click();
  const detail = page.locator('[data-testid^="citation-detail-"]').first();
  await detail.locator('[data-testid$="-edit"]').click();

  // Cancel
  const editForm = page.locator('[data-testid^="citation-edit-"]').first();
  await editForm.locator('[data-testid$="-cancel"]').click();

  // Should be back to detail
  await expect(detail).toBeVisible();
});
