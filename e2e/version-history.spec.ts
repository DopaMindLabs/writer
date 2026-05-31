import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const gotoFirstDoc = async (page: Page): Promise<void> => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  await expect(page.locator('[aria-label="Document body"]')).toBeVisible();
};

// Open the doc inspector and switch to the given section. The inspector starts
// collapsed; the topbar button reveals the icon rail, and clicking a section
// icon both selects it and expands the full panel.
const openInspectorSection = async (
  page: Page,
  section: string,
): Promise<void> => {
  const inspector = page.getByTestId('doc-inspector');
  if (!(await inspector.isVisible())) {
    const iconTab = page.getByTestId(`doc-inspector-icons-${section}`);
    if (!(await iconTab.isVisible())) {
      await page.getByRole('button', { name: /doc inspector/i }).click();
    }
    await iconTab.click();
  }
  await expect(inspector).toBeVisible();
  await inspector.getByTestId(`doc-inspector-tab-${section}`).click();
  await expect(page.getByTestId(`doc-inspector-pane-${section}`)).toBeVisible();
};

test('captures a baseline version and lists it in the history pane', async ({
  page,
}) => {
  await gotoFirstDoc(page);
  await openInspectorSection(page, 'history');

  const pane = page.getByTestId('doc-inspector-pane-history');
  // A baseline revision is recorded when the document is opened.
  await expect(pane.getByText(/baseline/i)).toBeVisible();
  await expect(pane.getByText(/NOW/)).toBeVisible();
});

test('saves a manual version from the history pane', async ({ page }) => {
  await gotoFirstDoc(page);

  await openInspectorSection(page, 'history');
  await page.getByTestId('history-save-version').click();

  // A styled in-app dialog collects the optional label (no native prompt).
  const dialog = page.getByTestId('save-version-dialog');
  await expect(dialog).toBeVisible();
  await page.getByTestId('save-version-label').fill('milestone draft');
  await page.getByTestId('save-version-submit').click();
  await expect(dialog).toBeHidden();

  const pane = page.getByTestId('doc-inspector-pane-history');
  await expect(pane.getByText('milestone draft')).toBeVisible();
});

test('compares versions and toggles the diff layout in the modal', async ({
  page,
}) => {
  await gotoFirstDoc(page);

  // Make an edit so there is a difference between the baseline and current text.
  const editor = page.locator('[aria-label="Document body"]');
  await editor.click();
  await page.keyboard.type(' an added sentence');
  await page.waitForTimeout(800);

  await openInspectorSection(page, 'history');
  await page.getByTestId('open-version-modal').click();

  const modal = page.getByTestId('version-history-modal');
  await expect(modal).toBeVisible();
  await expect(page.getByTestId('diff-view')).toBeVisible();

  // Toggle between side-by-side (default) and inline layouts.
  await page.getByTestId('diff-mode-toggle').click();
  await expect(page.getByTestId('diff-view')).toBeVisible();
});

test('restores an earlier version, creating a safety snapshot', async ({
  page,
}) => {
  await gotoFirstDoc(page);

  const editor = page.locator('[aria-label="Document body"]');
  const probe = `restore probe ${Date.now()}`;
  await editor.click();
  await page.keyboard.type(` ${probe}`);
  await page.waitForTimeout(800);

  await openInspectorSection(page, 'history');
  await page.getByTestId('open-version-modal').click();

  const modal = page.getByTestId('version-history-modal');
  await expect(modal).toBeVisible();
  await page.getByTestId('modal-restore').click();

  // A styled confirm dialog appears (no native confirm); accept it.
  await expect(page.getByTestId('confirm-dialog')).toBeVisible();
  await page.getByTestId('confirm-dialog-confirm').click();

  // Modal closes after a restore.
  await expect(modal).toBeHidden();

  // A pre-restore safety snapshot now exists in the history list.
  await openInspectorSection(page, 'history');
  const pane = page.getByTestId('doc-inspector-pane-history');
  await expect(pane.getByText('pre-restore')).toBeVisible();
});
