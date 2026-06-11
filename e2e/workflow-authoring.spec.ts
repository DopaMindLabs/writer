import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test.describe('Workflow: authoring a manuscript', () => {
  test('draft, rename, add a doc, cycle view modes, and persist across a reload', async ({
    page,
  }) => {
    const spaceId = await getFirstSpaceIdFromHome(page);
    let newName = '';

    await test.step('Given the writer opens the seeded space and the Abstract doc', async () => {
      await page.goto(`/#/s/${spaceId}`);
      await page.getByRole('link', { name: /^Abstract/ }).click();
      await page.waitForURL(new RegExp(`/s/${spaceId}/d/`));
    });

    await test.step('When they draft prose in the editor', async () => {
      const editor = page.locator('[aria-label="Document body"]');
      await expect(editor).toBeVisible();
      await editor.click();
      await page.keyboard.type('Intro paragraph from the authoring journey');
      await expect(editor).toContainText('Intro paragraph from the authoring journey');
      await page.waitForTimeout(1000);
    });

    await test.step('And they rename the doc via the topbar breadcrumb', async () => {
      const header = page.locator('header').first();
      await header.getByRole('button', { name: 'Abstract' }).dblclick();
      const renameInput = header.getByRole('textbox', { name: /Rename doc/i });
      await expect(renameInput).toBeFocused();
      newName = `Intro ${Date.now()}`;
      await renameInput.fill(newName);
      await renameInput.press('Enter');
      await expect(header.getByRole('button', { name: newName })).toBeVisible();
    });

    await test.step('And they add a new doc under the Manuscript section', async () => {
      const sidebar = page.locator('aside').last();
      await sidebar.getByRole('button', { name: 'Add doc to Manuscript' }).click();
      const docInput = sidebar.getByPlaceholder(/Doc name \(Enter to create\)/i);
      await docInput.fill('Methods');
      await docInput.press('Enter');
      await page.waitForURL(new RegExp(`/s/${spaceId}/d/[^/?#]+$`));
      await expect(sidebar.getByRole('link', { name: /Methods/ })).toBeVisible();
    });

    await test.step('And they cycle the Read and Split view modes', async () => {
      await page.getByRole('link', { name: 'read', exact: true }).click();
      await page.waitForURL(/\/read/);
      await expect(page.locator('[aria-label="Document body"]')).toHaveAttribute(
        'contenteditable',
        'false',
      );
      await page.getByRole('link', { name: 'split', exact: true }).click();
      await page.waitForURL(/\/split/);
    });

    await test.step('And they set the Split right pane to citations', async () => {
      await page.getByLabel(/Right pane document/i).selectOption('citations');
      await page.waitForURL(/with=citations/);
      await expect(page.getByText(/Sources \/ Citations/i)).toBeVisible();
    });

    await test.step('Then the renamed doc and prose survive a hard reload (local-drive sync)', async () => {
      await page.goto(`/#/s/${spaceId}`);
      await page.getByRole('link', { name: new RegExp(newName) }).click();
      await page.waitForURL(new RegExp(`/s/${spaceId}/d/`));
      await page.reload();
      await expect(page.locator('[aria-label="Document body"]')).toContainText(
        'Intro paragraph from the authoring journey',
      );
      await page.goto('/#/');
      await expect(
        page.getByRole('link', { name: /Continue writing/i }),
      ).toBeVisible();
    });
  });
});
