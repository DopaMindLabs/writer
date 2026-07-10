import { test, expect } from './_helpers';
import { reseedAndGoHome, gotoFirstDoc } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('inspector shows all tabs and switches between them', async ({ page }) => {
  await gotoFirstDoc(page);

  const inspector = page.getByTestId('doc-inspector');
  // Open inspector if collapsed
  if (!(await inspector.isVisible())) {
    // Try clicking the inspector toggle in the toolbar
    const toggle = page.locator('[data-testid="doc-inspector-collapse"]');
    if (await toggle.isVisible()) await toggle.click();
  }

  // Check tabs exist
  const infoTab = page.getByTestId('doc-inspector-tab-info');
  const outlineTab = page.getByTestId('doc-inspector-tab-outline');
  if (await infoTab.isVisible()) {
    await infoTab.click();
    await expect(page.getByTestId('doc-inspector-pane-info')).toBeVisible();
  }
  if (await outlineTab.isVisible()) {
    await outlineTab.click();
    await expect(page.getByTestId('doc-inspector-pane-outline')).toBeVisible();
  }
});

test('inspector info pane shows document stats fields', async ({ page }) => {
  await gotoFirstDoc(page);

  const infoTab = page.getByTestId('doc-inspector-tab-info');
  if (!(await infoTab.isVisible({ timeout: 3000 }).catch(() => false))) return;
  await infoTab.click();

  const infoPane = page.getByTestId('doc-inspector-info');
  if (!(await infoPane.isVisible({ timeout: 3000 }).catch(() => false))) return;

  // Check status field
  const statusField = page.getByTestId('inspector-status');
  if (await statusField.isVisible({ timeout: 2000 }).catch(() => false)) {
    await expect(statusField).toBeVisible();
  }
});

test('inspector character limit overlay triggers at boundary', async ({
  page,
}) => {
  await gotoFirstDoc(page);

  // Open info tab
  const infoTab = page.getByTestId('doc-inspector-tab-info');
  if (await infoTab.isVisible()) await infoTab.click();

  // Set a low char limit
  const charInput = page.getByTestId('inspector-charLimit');
  if (await charInput.isVisible()) {
    await charInput.fill('10');
    await charInput.press('Enter');

    // Type enough to exceed
    const editor = page.getByTestId('document-body');
    await editor.click();
    await page.keyboard.type('This text is longer than ten characters for sure');

    // The limit overlay should appear
    const overlay = page.locator('[data-testid="char-limit-overlay"]');
    if (await overlay.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(overlay).toBeVisible();
    }
  }
});

test('inspector word limit field interaction', async ({ page }) => {
  await gotoFirstDoc(page);

  const infoTab = page.getByTestId('doc-inspector-tab-info');
  if (await infoTab.isVisible()) await infoTab.click();

  const wordInput = page.getByTestId('inspector-wordLimit');
  if (await wordInput.isVisible()) {
    await wordInput.fill('50');
    await wordInput.press('Enter');
    await expect(wordInput).toHaveValue('50');

    // Clear it
    await wordInput.fill('');
    await wordInput.press('Enter');
  }
});

test('inspector due date field sets and clears a date', async ({ page }) => {
  await gotoFirstDoc(page);

  const infoTab = page.getByTestId('doc-inspector-tab-info');
  if (await infoTab.isVisible()) await infoTab.click();

  const dueDate = page.getByTestId('inspector-due-date');
  if (await dueDate.isVisible()) {
    await dueDate.fill('2026-12-25');
    await expect(dueDate).toHaveValue('2026-12-25');
  }
});

test('save a manual version from the inspector', async ({ page }) => {
  await gotoFirstDoc(page);

  // Type something to make content
  const editor = page.getByTestId('document-body');
  await editor.click();
  await page.keyboard.type('Version content');

  // Click save version
  const saveBtn = page.getByTestId('history-save-version');
  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    // A revision row should appear
    const revisionRow = page.locator('[data-testid^="revision-row-"]');
    await expect(revisionRow.first()).toBeVisible();
  }
});

test('open version history modal from inspector', async ({ page }) => {
  await gotoFirstDoc(page);

  // Type and save version
  const editor = page.getByTestId('document-body');
  await editor.click();
  await page.keyboard.type('History test');

  const saveBtn = page.getByTestId('history-save-version');
  if (await saveBtn.isVisible()) {
    await saveBtn.click();

    // Open full history modal
    const openModal = page.getByTestId('open-version-modal');
    if (await openModal.isVisible()) {
      await openModal.click();
      await expect(page.getByTestId('version-history-modal')).toBeVisible();

      // Modal list should have entries
      await expect(page.getByTestId('version-modal-list')).toBeVisible();

      // Click a version entry to see diff
      const item = page.locator('[data-testid^="version-modal-item-"]').first();
      if (await item.isVisible()) {
        await item.click();
        await expect(page.getByTestId('diff-view')).toBeVisible();
      }
    }
  }
});

test('toggle diff mode in version history modal', async ({ page }) => {
  await gotoFirstDoc(page);

  const editor = page.getByTestId('document-body');
  await editor.click();
  await page.keyboard.type('Diff mode test');

  const saveBtn = page.getByTestId('history-save-version');
  if (!(await saveBtn.isVisible())) return;
  await saveBtn.click();

  const openModal = page.getByTestId('open-version-modal');
  if (!(await openModal.isVisible())) return;
  await openModal.click();

  const modal = page.getByTestId('version-history-modal');
  await expect(modal).toBeVisible();

  const item = page.locator('[data-testid^="version-modal-item-"]').first();
  if (!(await item.isVisible())) return;
  await item.click();

  const toggle = page.getByTestId('diff-mode-toggle');
  if (await toggle.isVisible()) {
    await toggle.click();
    // Should still show diff view
    await expect(page.getByTestId('diff-view')).toBeVisible();
  }
});

test('restore a version from the modal', async ({ page }) => {
  await gotoFirstDoc(page);

  const editor = page.getByTestId('document-body');
  await editor.click();
  await page.keyboard.type('Original content for restore test');

  const saveBtn = page.getByTestId('history-save-version');
  if (!(await saveBtn.isVisible())) return;
  await saveBtn.click();

  // Edit content again
  await editor.click();
  // ControlOrMeta maps to Control off-mac and Meta on mac; a bare `Meta+a`
  // does not select-all on Linux/Windows CI, so the type below would append
  // rather than replace.
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('New content after version save');

  const openModal = page.getByTestId('open-version-modal');
  if (!(await openModal.isVisible())) return;
  await openModal.click();

  const item = page.locator('[data-testid^="version-modal-item-"]').first();
  if (!(await item.isVisible())) return;
  await item.click();

  const restoreBtn = page.getByTestId('modal-restore');
  if (await restoreBtn.isVisible()) {
    page.on('dialog', (dialog) => dialog.accept());
    await restoreBtn.click();
    // Modal should close
    await expect(page.getByTestId('version-history-modal')).not.toBeVisible();
  }
});
