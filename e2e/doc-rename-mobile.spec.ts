import { test, expect, reseedAndGoHome, gotoFirstDoc } from './_helpers';

test.use({ viewport: { width: 390, height: 800 } });

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('renames a doc from the nav drawer row menu on mobile', async ({ page }) => {
  const { docId } = await gotoFirstDoc(page);

  await page.getByRole('button', { name: /open nav/i }).click();
  const drawer = page.getByRole('dialog', { name: 'Navigation' });
  await expect(drawer).toBeVisible();

  await drawer.getByTestId(`sidebar-doc-${docId}-menu`).click();
  await page.getByTestId(`sidebar-doc-${docId}-rename`).click();

  const input = page.getByTestId('rename-doc-input');
  await expect(input).toBeVisible();
  await input.fill('Renamed on mobile');
  await page.getByTestId('rename-doc-submit').click();

  // The row updates live and the drawer stays open.
  await expect(
    drawer.getByTestId(`sidebar-doc-${docId}-name`),
  ).toHaveText('Renamed on mobile');

  // Closing the drawer reveals the topbar with the new name.
  await drawer.getByRole('button', { name: 'Close navigation' }).click();
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

test('cancelling the rename dialog leaves the doc name unchanged', async ({
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

  const input = page.getByTestId('rename-doc-input');
  await input.fill('Discarded name');
  await page.getByTestId('rename-doc-cancel').click();

  await expect(page.getByTestId('rename-doc-dialog')).toBeHidden();
  await expect(row).toHaveText(originalName);
});
