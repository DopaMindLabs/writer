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
  await expect(pane.getByText(/baseline/i)).toBeVisible();
  await expect(pane.getByText(/NOW/)).toBeVisible();
});

test('saves a manual version from the history pane', async ({ page }) => {
  await gotoFirstDoc(page);

  await openInspectorSection(page, 'history');
  await page.getByTestId('history-save-version').click();

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

  const editor = page.locator('[aria-label="Document body"]');
  await editor.click();
  await page.keyboard.type(' an added sentence');
  await page.waitForTimeout(800);

  await openInspectorSection(page, 'history');
  await page.getByTestId('open-version-modal').click();

  const modal = page.getByTestId('version-history-modal');
  await expect(modal).toBeVisible();
  await expect(page.getByTestId('diff-view')).toBeVisible();

  await page.getByTestId('diff-mode-toggle').click();
  await expect(page.getByTestId('diff-view')).toBeVisible();
});

test('hides all version controls in read mode', async ({ page }) => {
  await gotoFirstDoc(page);
  const m = /#\/s\/([^/]+)\/d\/([^/]+)/.exec(page.url());
  if (!m) throw new Error(`expected a doc URL, got ${page.url()}`);
  const [, spaceId, docId] = m;
  await page.goto(`/#/s/${spaceId}/d/${docId}/read`);
  await expect(page.locator('[aria-label="Document body"]')).toBeVisible();

  await openInspectorSection(page, 'outline');
  await expect(page.getByTestId('doc-inspector-tab-outline')).toBeVisible();
  await expect(page.getByTestId('doc-inspector-tab-history')).toHaveCount(0);
  await expect(page.getByTestId('doc-inspector-icons-history')).toHaveCount(0);
  await expect(page.getByTestId('history-save-version')).toHaveCount(0);
  await expect(page.getByTestId('open-version-modal')).toHaveCount(0);
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

  await expect(page.getByTestId('confirm-dialog')).toBeVisible();
  await page.getByTestId('confirm-dialog-confirm').click();

  await expect(modal).toBeHidden();

  await openInspectorSection(page, 'history');
  const pane = page.getByTestId('doc-inspector-pane-history');
  await expect(pane.getByText('pre-restore')).toBeVisible();
});
