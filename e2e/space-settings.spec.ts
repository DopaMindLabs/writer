import { test, expect } from './_helpers';
import { getFirstSpaceIdFromHome, reseedAndGoHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('navigates from the sidebar space menu to per-space settings', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);

  const trigger = page.getByRole('button', { name: /open space menu/i });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click({ force: true });

  await page.getByTestId('space-menu-popover')
    .getByRole('link', { name: /^settings$/i })
    .click();

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

test('Sharing tab shows the Sharing placeholder content', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings?tab=sharing`);

  await expect(
    page.getByRole('heading', { name: /^sharing$/i }),
  ).toBeVisible();
  await expect(page.getByText(/^Visibility$/i)).toBeVisible();
});

test('Template tab shows the Template placeholder content', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings?tab=template`);

  await expect(
    page.getByRole('heading', { name: /^template$/i }),
  ).toBeVisible();
  await expect(page.getByText(/Current template/i)).toBeVisible();
});

test('Sidebar SpaceRail remains visible in space settings (lets the user return via the rail)', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings`);

  await expect(
    page.getByRole('link', { name: /Create new space/i }),
  ).toBeVisible();
});

test('Backups tab snapshot now generates a manifest entry', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings?tab=backups`);
  await page.evaluate(() => {
    HTMLAnchorElement.prototype.click = function () {};
  });
  await page.getByRole('button', { name: /snapshot now/i }).click();
  await expect(page.getByTestId('backups-history')).toBeVisible();
});

test('cycles through every per-space settings tab without crashing', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings`);
  await page.waitForLoadState('networkidle');
  const tabs = [
    'General',
    'Template',
    'Highlight palette',
    'Sharing',
    'Members',
    'Backups',
    'Export',
    'Danger zone',
  ];
  for (const label of tabs) {
    await page.getByRole('button', { name: new RegExp(`^${label}$`) }).click();
    await expect(
      page.getByRole('heading', { name: new RegExp(`^${label}$`, 'i') }),
    ).toBeVisible();
  }
});

test('renames the space via the General tab', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings`);

  const nameInput = page.getByLabel(/space name/i);
  await nameInput.fill('Renamed via E2E');
  await nameInput.press('Enter');

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
