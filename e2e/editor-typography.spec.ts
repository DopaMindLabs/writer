import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const gotoDoc = async (page: Page, spaceId: string): Promise<void> => {
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
};

const openTypographyTab = async (page: Page): Promise<void> => {
  await page.goto('/#/settings?tab=typography');
  await page.waitForLoadState('networkidle');
};

const openInspectorInfo = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: /doc inspector/i }).click();
  const iconsInfo = page.getByTestId('doc-inspector-icons-info');
  if (await iconsInfo.isVisible()) {
    await iconsInfo.click();
  } else {
    await page.getByTestId('doc-inspector-tab-info').click();
  }
  await expect(page.getByTestId('doc-inspector-info')).toBeVisible();
};

test('Typography tab exposes typeface and size controls with a preview', async ({
  page,
}) => {
  await openTypographyTab(page);
  await expect(page.getByTestId('setting-editor-font')).toBeVisible();
  await expect(page.getByTestId('setting-editor-size')).toBeVisible();
  await expect(page.getByTestId('typography-preview')).toBeVisible();
});

test('selecting Sans in Typography settings updates the editor body typeface', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await openTypographyTab(page);
  await page.getByTestId('editor-font-sans').click();
  await expect(page.getByTestId('typography-preview')).toHaveAttribute(
    'data-editor-font',
    'sans',
  );

  await gotoDoc(page, spaceId);
  const editorSurface = page.locator('[data-editor-font]').first();
  await expect(editorSurface).toHaveAttribute('data-editor-font', 'sans');
});

test('selecting Large in Typography settings updates the editor body size', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await openTypographyTab(page);
  await page.getByTestId('editor-size-lg').click();

  await gotoDoc(page, spaceId);
  const editorSurface = page.locator('[data-editor-size]').first();
  await expect(editorSurface).toHaveAttribute('data-editor-size', 'lg');
});

test('Typography settings persist after reload', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await openTypographyTab(page);
  await page.getByTestId('editor-font-mono').click();
  await page.getByTestId('editor-size-xl').click();

  await gotoDoc(page, spaceId);
  await page.reload();
  await page.waitForFunction(
    () => !document.body.innerText.includes('Booting…'),
  );

  const editorSurface = page.locator('[data-editor-font]').first();
  await expect(editorSurface).toHaveAttribute('data-editor-font', 'mono');
  await expect(editorSurface).toHaveAttribute('data-editor-size', 'xl');
});

test('per-document override applies only to the active document', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  // Default at sans/lg
  await openTypographyTab(page);
  await page.getByTestId('editor-font-sans').click();
  await page.getByTestId('editor-size-lg').click();

  // Open document and override to mono/xl in the inspector
  await gotoDoc(page, spaceId);
  await openInspectorInfo(page);
  await page.getByTestId('inspector-editor-font-mono').click();
  await page.getByTestId('inspector-editor-size-xl').click();

  const editorSurface = page.locator('[data-editor-font]').first();
  await expect(editorSurface).toHaveAttribute('data-editor-font', 'mono');
  await expect(editorSurface).toHaveAttribute('data-editor-size', 'xl');
});

test('"Use default" clears the per-document override and returns to the universal default', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  // Universal default sans/lg
  await openTypographyTab(page);
  await page.getByTestId('editor-font-sans').click();
  await page.getByTestId('editor-size-lg').click();

  // Override on doc to mono/xl
  await gotoDoc(page, spaceId);
  await openInspectorInfo(page);
  await page.getByTestId('inspector-editor-font-mono').click();
  await page.getByTestId('inspector-editor-size-xl').click();
  const editorSurface = page.locator('[data-editor-font]').first();
  await expect(editorSurface).toHaveAttribute('data-editor-font', 'mono');

  // Clear via "Use default"
  await page.getByTestId('inspector-typography-reset').click();
  await expect(editorSurface).toHaveAttribute('data-editor-font', 'sans');
  await expect(editorSurface).toHaveAttribute('data-editor-size', 'lg');
  await expect(page.getByTestId('inspector-typography-reset')).toHaveCount(0);
});

test('default editor body renders in serif at base size without any user changes', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await gotoDoc(page, spaceId);
  const editorSurface = page.locator('[data-editor-font]').first();
  await expect(editorSurface).toHaveAttribute('data-editor-font', 'serif');
  await expect(editorSurface).toHaveAttribute('data-editor-size', 'base');
  await expect(editorSurface).toHaveAttribute(
    'data-editor-follows-a11y',
    'true',
  );
});

test('a11y text-size composes with editor body size by default', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  await page.goto('/#/settings?tab=accessibility');
  await page.waitForLoadState('networkidle');
  await page
    .getByRole('group', { name: 'Text size' })
    .getByRole('button', { name: 'Large', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-text-scale', 'lg');

  await gotoDoc(page, spaceId);
  const editorSurface = page.locator('[data-editor-font]').first();
  await expect(editorSurface).toHaveAttribute(
    'data-editor-follows-a11y',
    'true',
  );
  // Default editor size (base = 1) × a11y lg (1.12) = 1.12
  const computed = await editorSurface.evaluate(
    (el) => window.getComputedStyle(el).getPropertyValue('--editor-size-scale').trim(),
  );
  expect(parseFloat(computed)).toBeCloseTo(1.12, 2);
});

test('turning off "Follow Accessibility text size" decouples the editor from a11y scale', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);

  // Raise a11y text size to xl
  await page.goto('/#/settings?tab=accessibility');
  await page.waitForLoadState('networkidle');
  await page
    .getByRole('group', { name: 'Text size' })
    .getByRole('button', { name: 'Extra large' })
    .click();

  // Toggle compose off in typography settings
  await openTypographyTab(page);
  await page.getByRole('switch', { name: 'Follow Accessibility text size' }).click();

  await gotoDoc(page, spaceId);
  const editorSurface = page.locator('[data-editor-font]').first();
  await expect(editorSurface).toHaveAttribute(
    'data-editor-follows-a11y',
    'false',
  );
  // Decoupled: editor body size base = 1, ignoring a11y xl
  const computed = await editorSurface.evaluate(
    (el) => window.getComputedStyle(el).getPropertyValue('--editor-size-scale').trim(),
  );
  expect(parseFloat(computed)).toBeCloseTo(1, 2);
});
