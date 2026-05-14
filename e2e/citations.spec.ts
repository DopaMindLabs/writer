import { test, expect } from '@playwright/test';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

const SAMPLE_BIBTEX = `@article{e2eSmith2024,
  author = {Smith, Jane},
  title  = {An End-to-End Citation},
  year   = {2024},
}`;

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('manually adds a BibTeX citation, filters it, and exports as .bib', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await expect(page.getByText(/no citations yet/i)).toBeVisible();

  await page.getByRole('button', { name: '+ add' }).click();
  await page.getByPlaceholder(/@article\{/).fill(SAMPLE_BIBTEX);
  await page.getByRole('button', { name: /add citation/i }).click();

  await expect(page.getByText('e2eSmith2024').first()).toBeVisible();
  await expect(page.getByRole('status')).toContainText(/Imported 1 citation/i);

  await page.getByPlaceholder(/authors, tags, year/i).fill('Smith');
  await expect(page.getByText('e2eSmith2024').first()).toBeVisible();

  await page.getByPlaceholder(/authors, tags, year/i).fill('zzznomatch');
  await expect(page.getByText(/no rows match your search/i)).toBeVisible();
  await page.getByPlaceholder(/authors, tags, year/i).fill('');

  const exportButton = page.getByRole('button', { name: /EXPORT AS \.BIB/i });
  await expect(exportButton).toBeEnabled();

  const downloadPromise = page.waitForEvent('download');
  await exportButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.bib$/);
});
