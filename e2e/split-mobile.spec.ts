import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const openSplitUrl = async (page: import('@playwright/test').Page) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  await page.locator('a[href*="/split"]').first().click();
  await page.waitForURL(/\/split/);
  return page.url();
};

test('split panes stack vertically on portrait mobile', async ({ page }) => {
  const splitUrl = await openSplitUrl(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(splitUrl);

  const separator = page.getByRole('separator', { name: /Resize split panes/i });
  await expect(separator).toBeVisible();
  await expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
});

test('split view with a second doc in the right pane', async ({ page }) => {
  await openSplitUrl(page);

  const rightSelect = page.getByTestId('split-right-pane-select');
  if (await rightSelect.isVisible()) {
    const options = await rightSelect.locator('option').allTextContents();
    const docOption = options.find(
      (o) => !o.toLowerCase().includes('brain') && !o.toLowerCase().includes('citation'),
    );
    if (docOption) {
      await rightSelect.selectOption({ label: docOption });
    }
  }
});

test('split divider responds to ArrowDown in stacked layout', async ({
  page,
}) => {
  const splitUrl = await openSplitUrl(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(splitUrl);

  const separator = page.getByRole('separator', { name: /Resize split panes/i });
  await expect(separator).toBeVisible();

  await separator.focus();
  const initial = Number(await separator.getAttribute('aria-valuenow'));
  await separator.press('ArrowDown');
  const after = Number(await separator.getAttribute('aria-valuenow'));
  expect(after).toBe(initial + 2);
});

test('split divider double-click resets to 50%', async ({ page }) => {
  await openSplitUrl(page);

  const separator = page.getByRole('separator', { name: /Resize split panes/i });
  await expect(separator).toBeVisible();

  await separator.focus();
  await separator.press('ArrowRight');
  await separator.press('ArrowRight');

  await separator.dblclick();
  const pct = Number(await separator.getAttribute('aria-valuenow'));
  expect(pct).toBe(50);
});
