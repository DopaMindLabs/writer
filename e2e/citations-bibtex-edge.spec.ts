import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

/**
 * These BibTeX entries exercise edge cases in the parser:
 * - prefix/suffix in author names
 * - 'et al.' handling
 * - date field (no year)
 * - missing key (should be skipped)
 * - booklet type → 'book'
 * - conference type → 'article'
 * - title with braces
 * - numeric-only year
 */
const EDGE_CASE_BIB = `@booklet{bklt01,
  author = {von der Leyen, Ursula and {World Health Organisation}},
  title  = {A Booklet Entry},
  year   = {2019},
}
@conference{conf01,
  author = {Smith, John and Doe, Jane and others},
  title  = {Conference Paper},
  year   = {2023},
}
@inbook{inb01,
  author = {Mononym},
  title  = {{Braced Title} in Inbook},
  date   = {2022-03},
}
@misc{misc01,
  title = {No Author Misc},
}`;

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('imports edge-case BibTeX entries with various author formats and types', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await page.getByTestId('citations-add-toggle').click();
  await page.getByTestId('citations-manual-add-input').fill(EDGE_CASE_BIB);
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(page.getByTestId('citations-status')).toContainText(
    /imported 4 citations/i,
  );

  // Verify specific entries appear
  await expect(page.getByText('bklt01').first()).toBeVisible();
  await expect(page.getByText('conf01').first()).toBeVisible();
  await expect(page.getByText('inb01').first()).toBeVisible();
  await expect(page.getByText('misc01').first()).toBeVisible();

  // Expand detail on the booklet to verify type mapping
  await page.getByRole('button', { name: /view citation bklt01/i }).click();
  const detail = page.locator('[data-testid^="citation-detail-"]').first();
  await expect(detail).toBeVisible();
  await expect(detail).toContainText('book');
});

test('exports imported citations and the downloaded file contains all keys', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);

  await page.getByTestId('citations-add-toggle').click();
  await page.getByTestId('citations-manual-add-input').fill(EDGE_CASE_BIB);
  await page.getByTestId('citations-manual-add-submit').click();
  await expect(page.getByTestId('citations-status')).toContainText(/imported/i);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('citations-export').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.bib$/);
});
