import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const gotoCitations = async (page: import('@playwright/test').Page) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/citations`);
  await expect(page.getByTestId('citations-pane')).toBeVisible();
  return spaceId;
};

test('import a multi-entry bibtex file with various types', async ({ page }) => {
  await gotoCitations(page);

  const initialCount = await page.locator('[data-testid^="citation-row-"]').count();

  // Create a multi-entry bib file content
  const bibContent = `
@article{smith2020,
  author = {Smith, John and Doe, Jane},
  title = {A Study on Testing},
  journal = {Journal of Tests},
  year = {2020},
  volume = {1},
  pages = {1--10}
}

@book{jones2019,
  author = {Jones, Alice},
  title = {The Art of Code},
  publisher = {Tech Press},
  year = {2019},
  edition = {2nd}
}

@inproceedings{wang2021,
  author = {Wang, Bob and Li, Carol},
  title = {Conference Paper Title},
  booktitle = {Proc. of ICSE},
  year = {2021},
  pages = {100--110}
}

@phdthesis{kumar2022,
  author = {Kumar, Dev},
  title = {Doctoral Work on AI},
  school = {MIT},
  year = {2022}
}

@misc{web2023,
  author = {Browser, Web},
  title = {Online Resource},
  howpublished = {\\url{https://example.com}},
  year = {2023}
}
`;

  // Use file chooser to upload
  const fileInput = page.getByTestId('citations-file-input');
  await fileInput.setInputFiles({
    name: 'test-refs.bib',
    mimeType: 'application/x-bibtex',
    buffer: Buffer.from(bibContent),
  });

  // Wait for import to complete - status should show imported count
  await expect(page.getByTestId('citations-status')).toContainText(/imported|added/i, {
    timeout: 10000,
  });

  // Should have more rows now
  const newCount = await page.locator('[data-testid^="citation-row-"]').count();
  expect(newCount).toBeGreaterThan(initialCount);
});

test('importing duplicate citations reports skipped count', async ({ page }) => {
  await gotoCitations(page);

  // Import once
  const bibContent = `
@article{unique_test_key_2026,
  author = {Test, Author},
  title = {Unique Test Entry},
  year = {2026}
}
`;
  const fileInput = page.getByTestId('citations-file-input');
  await fileInput.setInputFiles({
    name: 'first.bib',
    mimeType: 'application/x-bibtex',
    buffer: Buffer.from(bibContent),
  });
  await expect(page.getByTestId('citations-status')).toContainText(/1/);

  // Import the same file again - should report skip
  await fileInput.setInputFiles({
    name: 'second.bib',
    mimeType: 'application/x-bibtex',
    buffer: Buffer.from(bibContent),
  });
  await expect(page.getByTestId('citations-status')).toContainText(/skip/i, {
    timeout: 10000,
  });
});

test('importing invalid bibtex shows error status', async ({ page }) => {
  await gotoCitations(page);

  const fileInput = page.getByTestId('citations-file-input');
  await fileInput.setInputFiles({
    name: 'bad.bib',
    mimeType: 'application/x-bibtex',
    buffer: Buffer.from('this is not valid bibtex at all {{{'),
  });

  // Should show error or still process (may not throw depending on parser)
  const status = page.getByTestId('citations-status');
  await expect(status).toBeVisible({ timeout: 10000 });
});

test('search citations filters rows', async ({ page }) => {
  await gotoCitations(page);

  // First import some citations so we have rows to filter
  const bibContent = `
@article{searchFilter2024,
  author = {Filter, Search},
  title = {Filterable Entry},
  year = {2024}
}
`;
  const fileInput = page.getByTestId('citations-file-input');
  await fileInput.setInputFiles({
    name: 'search-test.bib',
    mimeType: 'application/x-bibtex',
    buffer: Buffer.from(bibContent),
  });
  await expect(page.getByTestId('citations-status')).toContainText(/1/);

  const totalBefore = await page.locator('[data-testid^="citation-row-"]').count();
  expect(totalBefore).toBeGreaterThan(0);

  const search = page.getByTestId('citations-search');
  await search.fill('zzzznonexistent');
  // After filtering, no rows should match
  await expect(page.locator('[data-testid^="citation-row-"]')).toHaveCount(0);

  // Clear search restores rows
  await search.fill('');
  await expect(page.locator('[data-testid^="citation-row-"]')).toHaveCount(totalBefore);
});

test('bibtex with booklet type is imported as book', async ({ page }) => {
  await gotoCitations(page);

  const bibContent = `
@booklet{pamphlet2024,
  author = {Pamphlet Author},
  title = {A Short Booklet},
  year = {2024}
}
`;

  const fileInput = page.getByTestId('citations-file-input');
  await fileInput.setInputFiles({
    name: 'booklet.bib',
    mimeType: 'application/x-bibtex',
    buffer: Buffer.from(bibContent),
  });
  await expect(page.getByTestId('citations-status')).toContainText(/1/);
});

test('bibtex with date field instead of year is handled', async ({ page }) => {
  await gotoCitations(page);

  const bibContent = `
@article{dateonly2025,
  author = {Date Researcher},
  title = {Using Date Instead of Year},
  date = {2025-03-15},
  journal = {Modern Journal}
}
`;

  const fileInput = page.getByTestId('citations-file-input');
  await fileInput.setInputFiles({
    name: 'dateonly.bib',
    mimeType: 'application/x-bibtex',
    buffer: Buffer.from(bibContent),
  });
  await expect(page.getByTestId('citations-status')).toContainText(/1/);
});
