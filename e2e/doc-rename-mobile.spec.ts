import { test, expect, reseedAndGoHome, gotoFirstDoc } from './_helpers';

test.use({ viewport: { width: 390, height: 800 } });

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('renames a doc inline from the nav drawer row menu on mobile', async ({ page }) => {
  const { docId } = await gotoFirstDoc(page);

  await page.getByRole('button', { name: /open nav/i }).click();
  const drawer = page.getByRole('dialog', { name: 'Navigation' });
  await expect(drawer).toBeVisible();

  await drawer.getByTestId(`sidebar-doc-${docId}-menu`).click();
  await page.getByTestId(`sidebar-doc-${docId}-rename`).click();

  // The row itself switches to the same inline input double-click opens.
  const input = drawer.getByTestId(`sidebar-doc-${docId}-rename-input`);
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
  await input.fill('Renamed on mobile');
  await input.press('Enter');

  // The row updates live and the drawer stays open.
  await expect(
    drawer.getByTestId(`sidebar-doc-${docId}-name`),
  ).toHaveText('Renamed on mobile');

  // Closing the drawer (Escape) reveals the topbar with the new name.
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(page.getByTestId('topbar-doc-name')).toHaveText(
    'Renamed on mobile',
  );

  // The rename persists across a reload.
  await page.reload();
  await expect(page.getByTestId('topbar-doc-name')).toHaveText(
    'Renamed on mobile',
  );
});

test('escaping the inline rename leaves the doc name unchanged', async ({
  page,
}) => {
  const { docId } = await gotoFirstDoc(page);

  await page.getByRole('button', { name: /open nav/i }).click();
  const drawer = page.getByRole('dialog', { name: 'Navigation' });
  await expect(drawer).toBeVisible();

  const row = drawer.getByTestId(`sidebar-doc-${docId}-name`);
  const originalName = await row.innerText();

  await drawer.getByTestId(`sidebar-doc-${docId}-menu`).click();
  await page.getByTestId(`sidebar-doc-${docId}-rename`).click();

  const input = drawer.getByTestId(`sidebar-doc-${docId}-rename-input`);
  await expect(input).toBeFocused();
  await input.fill('Discarded name');
  await input.press('Escape');

  // Escape reverts the edit and restores the row; the drawer stays open.
  await expect(input).toHaveCount(0);
  await expect(row).toHaveText(originalName);
  await expect(drawer).toBeVisible();
});
