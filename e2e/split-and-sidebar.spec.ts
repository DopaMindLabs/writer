import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('split view renders both panes, divider responds to keyboard, and right pane switches to citations', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.getByRole('link', { name: /^Abstract/ }).click();
  await page.waitForURL(new RegExp(`/s/${spaceId}/d/`));

  await page.getByRole('link', { name: 'split', exact: true }).click();
  await page.waitForURL(/\/split/);

  const separator = page.getByRole('separator', { name: /Resize split panes/i });
  await expect(separator).toBeVisible();

  const initialPct = Number(await separator.getAttribute('aria-valuenow'));
  expect(initialPct).toBeGreaterThan(24);
  expect(initialPct).toBeLessThan(76);

  await separator.focus();
  await separator.press('ArrowRight');
  await separator.press('ArrowRight');
  await expect
    .poll(async () => Number(await separator.getAttribute('aria-valuenow')))
    .toBe(initialPct + 4);

  await separator.press('Home');
  await expect(separator).toHaveAttribute('aria-valuenow', '25');

  await separator.press('End');
  await expect(separator).toHaveAttribute('aria-valuenow', '75');

  await separator.press(' ');
  await expect(separator).toHaveAttribute('aria-valuenow', '50');

  await separator.press('Shift+ArrowLeft');
  await expect(separator).toHaveAttribute('aria-valuenow', '40');

  const rightSelect = page.getByLabel(/Right pane document/i);
  await rightSelect.selectOption('citations');
  await page.waitForURL(/with=citations/);
  await expect(page.getByText(/Sources \/ Citations/i)).toBeVisible();
  await expect(page.getByText(/STYLE — CHICAGO/i)).toBeVisible();

  await separator.dblclick();
  await expect(separator).toHaveAttribute('aria-valuenow', '50');
});

test('sidebar lets the user inline-rename a space via Enter and revert via Escape', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.getByRole('link', { name: /^Abstract/ }).click();
  await page.waitForURL(new RegExp(`/s/${spaceId}/d/`));

  const sidebar = page.locator('aside').last();

  await sidebar.getByRole('button', { name: 'Bioinformatics' }).click();
  const renameInput = sidebar.getByRole('textbox', { name: 'Rename space' });
  await expect(renameInput).toBeVisible();
  await renameInput.fill('Renamed Space');
  await renameInput.press('Enter');
  await expect(
    sidebar.getByRole('button', { name: 'Renamed Space' }),
  ).toBeVisible();

  await sidebar.getByRole('button', { name: 'Renamed Space' }).click();
  const renameInput2 = sidebar.getByRole('textbox', { name: 'Rename space' });
  await renameInput2.fill('Should Not Save');
  await renameInput2.press('Escape');
  await expect(
    sidebar.getByRole('button', { name: 'Renamed Space' }),
  ).toBeVisible();
  await expect(
    sidebar.getByRole('button', { name: 'Should Not Save' }),
  ).toHaveCount(0);
});

test('sidebar add-doc button creates a new doc under a section and navigates to it', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.getByRole('link', { name: /^Abstract/ }).click();
  await page.waitForURL(new RegExp(`/s/${spaceId}/d/`));

  const sidebar = page.locator('aside').last();
  await sidebar
    .getByRole('button', { name: 'Add doc to Manuscript' })
    .click();

  const docInput = sidebar.getByPlaceholder(/Doc name \(Enter to create\)/i);
  await expect(docInput).toBeVisible();
  await docInput.fill('My Spec-Created Doc');
  await docInput.press('Enter');

  await page.waitForURL(new RegExp(`/s/${spaceId}/d/[^/?#]+$`));
  await expect(
    sidebar.getByRole('link', { name: /My Spec-Created Doc/ }),
  ).toBeVisible();
});

test('sidebar add-doc input cancels via Escape without creating a doc', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.getByRole('link', { name: /^Abstract/ }).click();
  await page.waitForURL(new RegExp(`/s/${spaceId}/d/`));

  const sidebar = page.locator('aside').last();
  await sidebar
    .getByRole('button', { name: 'Add doc to Manuscript' })
    .click();

  const docInput = sidebar.getByPlaceholder(/Doc name \(Enter to create\)/i);
  await docInput.fill('Should Not Persist');
  await docInput.press('Escape');

  await expect(docInput).toHaveCount(0);
  await expect(
    sidebar.getByRole('link', { name: /Should Not Persist/ }),
  ).toHaveCount(0);
});

test('sidebar Brain space link navigates to /dump and marks itself active', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.getByRole('link', { name: /^Abstract/ }).click();
  await page.waitForURL(new RegExp(`/s/${spaceId}/d/`));

  const sidebar = page.locator('aside').last();
  const brainLink = sidebar.getByRole('link', { name: /Brain space/i });
  await expect(brainLink).toBeVisible();

  await brainLink.click();
  await page.waitForURL(new RegExp(`/s/${spaceId}/dump$`));
  await expect(brainLink).toHaveClass(/border-ink/);
});

test('mobile viewport on a split URL shows the larger-screen notice and links back to write', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.getByRole('link', { name: /^Abstract/ }).click();
  await page.getByRole('link', { name: 'split', exact: true }).click();
  const splitUrl = page.url();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(splitUrl);

  await expect(
    page.getByText(/Needs a larger screen/i),
  ).toBeVisible();

  await page.getByRole('link', { name: /Open in Write/i }).click();
  await expect(page).not.toHaveURL(/\/split/);
});
