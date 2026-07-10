import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('space settings general tab reverts invalid edits and commits valid ones', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}/settings`);

  const name = page.getByTestId('space-settings-name-input');
  await expect(name).toBeVisible();
  const original = await name.inputValue();

  await name.fill('Escaped Edit');
  await name.press('Escape');
  await expect(name).toHaveValue(original);

  await name.fill('   ');
  await name.blur();
  await expect(name).toHaveValue(original);

  await name.fill('Renamed Space');
  await name.press('Enter');
  await expect(name).toHaveValue('Renamed Space');

  const tag = page.getByTestId('space-settings-tag-input');
  await tag.fill('NEWTAG');
  await tag.press('Enter');
  await expect(tag).toHaveValue('NEWTAG');
});
