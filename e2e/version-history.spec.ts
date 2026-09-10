import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome, readDocBody } from './_helpers';
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
  await expect(pane.getByText('Now', { exact: true })).toBeVisible();
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

test('shows changed and removed rows in the side-by-side diff', async ({
  page,
}) => {
  await gotoFirstDoc(page);
  const editor = page.locator('[aria-label="Document body"]');

  // Three lines, then a saved version to diff against — saving explicitly
  // rather than waiting on the auto-revision clock.
  await editor.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('Alpha line', { delay: 10 });
  await page.keyboard.press('Enter');
  await editor.pressSequentially('Beta line', { delay: 10 });
  await page.keyboard.press('Enter');
  await editor.pressSequentially('Gamma line', { delay: 10 });

  // A revision snapshots the persisted body, so wait for the autosave to land
  // before saving one — otherwise the version records the text as it was.
  const docId = /\/d\/([^/?#]+)/.exec(page.url())?.[1] ?? '';
  expect(docId).toBeTruthy();
  await expect.poll(() => readDocBody(page, docId)).toContain('Gamma line');

  await openInspectorSection(page, 'history');
  await page.getByTestId('history-save-version').click();
  const dialog = page.getByTestId('save-version-dialog');
  await expect(dialog).toBeVisible();
  await page.getByTestId('save-version-label').fill('three lines');
  await page.getByTestId('save-version-submit').click();
  await expect(dialog).toBeHidden();

  // Collapse the last two lines into one. Two lines out, one in, so the diff
  // has to pair them into a changed row and leave the surplus as a removed
  // row — the branches an append-only edit never reaches.
  await editor.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.press('Shift+ArrowUp');
  await page.keyboard.press('Shift+Home');
  await editor.pressSequentially('Merged line', { delay: 10 });

  await expect.poll(() => readDocBody(page, docId)).toContain('Merged line');

  await openInspectorSection(page, 'history');
  await page.getByTestId('open-version-modal').click();
  const modal = page.getByTestId('version-history-modal');
  await expect(modal).toBeVisible();

  // Compare against the saved three-line version rather than whichever
  // revision the modal opens on.
  await modal
    .getByTestId('version-modal-list')
    .getByRole('button', { name: /three lines/ })
    .click();

  const diff = page.getByTestId('diff-view');
  await expect(diff).toBeVisible();

  // Side by side is the default mode, so assert the rows it produces before
  // touching the toggle: inline renders both strings whatever the pairing did,
  // and would go green even if the surplus removed rows stopped being emitted.
  //
  // One removal pairs with the insertion to make a changed row; the rest have
  // nothing to pair with and stay removed, which is the branch under test.
  //
  // Which line ends up in which row depends on how the caret walks blank
  // paragraphs, and that differs between platforms — so assert the shape the
  // pairing produced, not the text that happened to land in it.
  await expect(diff.getByTestId('diff-after-changed')).toHaveText('Merged line');

  const removedBefore = await diff
    .getByTestId('diff-before-removed')
    .allTextContents();
  // Surplus removals: displaced text on the before side...
  expect(removedBefore.some((text) => text.trim().length > 0)).toBe(true);
  // ...and nothing on the after side, which is what makes them removals
  // rather than changes.
  const removedAfter = await diff
    .getByTestId('diff-after-removed')
    .allTextContents();
  expect(removedAfter.every((text) => text === '')).toBe(true);

  // The toggle is its own behaviour: inline keeps both texts in one column.
  await page.getByTestId('diff-mode-toggle').click();
  await expect(diff).toContainText('Merged line');
  await expect(diff).toContainText('Gamma line');
  await expect(diff.getByTestId('diff-before-changed')).toHaveCount(0);
});
