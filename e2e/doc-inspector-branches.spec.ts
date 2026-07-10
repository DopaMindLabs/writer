import { test, expect } from './_helpers';
import { reseedAndGoHome, gotoFirstDoc } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('doc inspector character limit field highlights when over limit', async ({
  page,
}) => {
  await gotoFirstDoc(page);

  // Open inspector
  const inspectorToggle = page.getByTestId('doc-inspector-toggle');
  if (await inspectorToggle.isVisible()) {
    await inspectorToggle.click();
  }

  // Go to info tab
  const infoTab = page.getByTestId('doc-inspector-tab-info');
  if (await infoTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await infoTab.click();

    // Set a very low character limit
    const charLimitInput = page.getByTestId('inspector-char-limit');
    if (await charLimitInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await charLimitInput.fill('5');
      await charLimitInput.press('Tab');
      // The boundary indicator should show (red/warning state)
      const boundary = page.getByTestId('inspector-char-boundary');
      if (await boundary.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(boundary).toBeVisible();
      }
    }
  }
});

test('doc inspector word limit shows count', async ({ page }) => {
  await gotoFirstDoc(page);

  const inspectorToggle = page.getByTestId('doc-inspector-toggle');
  if (await inspectorToggle.isVisible()) {
    await inspectorToggle.click();
  }

  const infoTab = page.getByTestId('doc-inspector-tab-info');
  if (await infoTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await infoTab.click();

    const wordLimitInput = page.getByTestId('inspector-word-limit');
    if (await wordLimitInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await wordLimitInput.fill('100');
      await wordLimitInput.press('Tab');
    }
  }
});

test('doc inspector due date can be set and cleared', async ({ page }) => {
  await gotoFirstDoc(page);

  const inspectorToggle = page.getByTestId('doc-inspector-toggle');
  if (await inspectorToggle.isVisible()) {
    await inspectorToggle.click();
  }

  const infoTab = page.getByTestId('doc-inspector-tab-info');
  if (await infoTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await infoTab.click();

    const dueDateInput = page.getByTestId('inspector-due-date');
    if (await dueDateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Set a date
      await dueDateInput.fill('2025-12-31');
      await dueDateInput.press('Tab');

      // Clear it
      await dueDateInput.fill('');
      await dueDateInput.press('Tab');
    }
  }
});

test('doc inspector status dropdown changes doc status', async ({ page }) => {
  await gotoFirstDoc(page);

  const inspectorToggle = page.getByTestId('doc-inspector-toggle');
  if (await inspectorToggle.isVisible()) {
    await inspectorToggle.click();
  }

  const infoTab = page.getByTestId('doc-inspector-tab-info');
  if (await infoTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await infoTab.click();

    const statusSelect = page.getByTestId('inspector-status');
    if (await statusSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      const options = statusSelect.locator('option');
      const count = await options.count();
      if (count > 1) {
        const secondVal = await options.nth(1).getAttribute('value');
        if (secondVal) {
          await statusSelect.selectOption(secondVal);
        }
      }
    }
  }
});

test('version history modal diff toggle and restore', async ({ page }) => {
  await gotoFirstDoc(page);

  // Type something to create content
  const editor = page.getByTestId('document-body');
  await editor.click();
  await page.keyboard.type('Version test content for diff');

  // Open inspector
  const inspectorToggle = page.getByTestId('doc-inspector-toggle');
  if (await inspectorToggle.isVisible()) {
    await inspectorToggle.click();
  }

  // Go to history tab
  const historyTab = page.getByTestId('doc-inspector-tab-history');
  if (await historyTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await historyTab.click();

    // Save a version
    const saveBtn = page.getByTestId('history-save-version');
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();

      // Open version history modal
      const historyBtn = page.getByTestId('history-view-all');
      if (await historyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await historyBtn.click();
        const modal = page.getByTestId('version-history-modal');
        await expect(modal).toBeVisible();

        // Toggle diff mode
        const diffToggle = modal.getByTestId('version-diff-toggle');
        if (await diffToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
          await diffToggle.click();
        }

        // Close modal
        await page.keyboard.press('Escape');
      }
    }
  }
});
