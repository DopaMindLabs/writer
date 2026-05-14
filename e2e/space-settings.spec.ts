import { test, expect } from './_helpers';
import { getFirstSpaceIdFromHome, reseedAndGoHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('navigates from the sidebar cog to per-space settings', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);

  const cog = page.getByRole('link', { name: /space settings/i });
  // The cog is opacity-0 until hover/focus. Hovering the sidebar header
  // group reveals it; once revealed we click to navigate.
  await cog.scrollIntoViewIfNeeded();
  await cog.click({ force: true });

  await expect(page).toHaveURL(new RegExp(`#/s/${spaceId}/settings`));
  await expect(
    page.getByRole('heading', { name: /^general$/i }),
  ).toBeVisible();
});

test('switches between space settings tabs', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings`);

  for (const tab of ['Sharing', 'Template', 'Members', 'Danger zone']) {
    await page.getByRole('button', { name: new RegExp(`^${tab}$`) }).click();
    await expect(
      page.getByRole('heading', { name: new RegExp(`^${tab}$`, 'i') }),
    ).toBeVisible();
  }
});

test('Sharing tab shows a coming-soon placeholder', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings?tab=sharing`);

  await expect(
    page.getByText(/Per-space visibility and shared links/i),
  ).toBeVisible();
});

test('Template tab shows a coming-soon placeholder', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings?tab=template`);

  await expect(
    page.getByText(/Changing a space's template after creation/i),
  ).toBeVisible();
});

test('Back link in space settings returns to the space (not home)', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings`);

  await page.getByRole('link', { name: /back/i }).click();
  // WriteScreen may auto-redirect to the first doc, so we accept either the
  // bare /s/:id route or the /s/:id/d/:docId redirect target. The contract
  // is "land back in this space", not specifically the bare write view.
  await expect(page).toHaveURL(new RegExp(`#/s/${spaceId}(?:/|$)`));
  await expect(page).not.toHaveURL(/#\/$/);
});

test('renames the space via the General tab', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings`);

  const nameInput = page.getByLabel(/space name/i);
  await nameInput.fill('Renamed via E2E');
  await nameInput.press('Enter');

  // Go to the writing view and verify the sidebar header reflects the change.
  await page.goto(`/#/s/${spaceId}`);
  await expect(page.locator('aside').getByText('Renamed via E2E')).toBeVisible();
});

test('keeps the delete confirm button disabled until the name is typed', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings?tab=danger`);

  await page.getByRole('button', { name: /delete this space/i }).click();
  const confirm = page.getByRole('button', { name: /^delete space$/i });
  await expect(confirm).toBeDisabled();

  const input = page.getByLabel(/type .* to confirm/i);
  await input.fill('not-the-name');
  await expect(confirm).toBeDisabled();
});

test('deletes the space when confirmation matches and lands on home', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings`);

  const nameInput = page.getByLabel(/space name/i);
  const spaceName = (await nameInput.inputValue()).trim();
  expect(spaceName.length).toBeGreaterThan(0);

  await page.getByRole('button', { name: /^danger zone$/i }).click();
  await page.getByRole('button', { name: /delete this space/i }).click();
  await page.getByLabel(/type .* to confirm/i).fill(spaceName);

  await page.getByRole('button', { name: /^delete space$/i }).click();

  await expect(page).toHaveURL(/#\/$|#\/?$/);
});
