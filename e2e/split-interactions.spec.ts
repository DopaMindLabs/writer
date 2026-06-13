import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const openSplitUrl = async (page: import('@playwright/test').Page) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.getByRole('link', { name: /^Abstract/ }).click();
  await page.getByRole('link', { name: 'split', exact: true }).click();
  await page.waitForURL(/with=dump/);
  return page.url();
};

test('split divider drag via pointer moves the divider', async ({ page }) => {
  await openSplitUrl(page);

  const separator = page.getByRole('separator', { name: /Resize split panes/i });
  await expect(separator).toBeVisible();

  const initial = Number(await separator.getAttribute('aria-valuenow'));

  // Simulate a drag by dispatching pointer events
  const box = await separator.boundingBox();
  if (!box) return;
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 80, startY, { steps: 5 });
  await page.mouse.up();

  const after = Number(await separator.getAttribute('aria-valuenow'));
  expect(after).not.toBe(initial);
});

test('split divider Shift+Arrow moves in large steps', async ({ page }) => {
  await openSplitUrl(page);

  const separator = page.getByRole('separator', { name: /Resize split panes/i });
  await expect(separator).toBeVisible();

  const initial = Number(await separator.getAttribute('aria-valuenow'));
  await separator.focus();
  await separator.press('Shift+ArrowRight');

  const after = Number(await separator.getAttribute('aria-valuenow'));
  // Large step (10) should produce bigger jump than regular (2)
  expect(Math.abs(after - initial)).toBeGreaterThanOrEqual(8);
});

test('split divider double-click resets to 50%', async ({ page }) => {
  await openSplitUrl(page);

  const separator = page.getByRole('separator', { name: /Resize split panes/i });
  await separator.focus();
  // Move it away from center first
  await separator.press('ArrowRight');
  await separator.press('ArrowRight');
  await separator.press('ArrowRight');
  await separator.press('ArrowRight');
  await separator.press('ArrowRight');

  const moved = Number(await separator.getAttribute('aria-valuenow'));
  expect(moved).toBeGreaterThan(50);

  // Double-click to reset
  await separator.dblclick();
  const reset = Number(await separator.getAttribute('aria-valuenow'));
  expect(reset).toBe(50);
});

test('split right pane shows a doc when selecting another document', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.getByRole('link', { name: /^Abstract/ }).click();
  await page.getByRole('link', { name: 'split', exact: true }).click();
  await page.waitForURL(/with=dump/);

  // Change right pane to a different doc (use the select)
  const select = page.getByTestId('split-right-pane-select');
  await expect(select).toBeVisible();

  // Get option values and pick a doc option (not dump/citations)
  const options = select.locator('option');
  const count = await options.count();
  let picked: string | null = null;
  for (let i = 0; i < count; i++) {
    const val = await options.nth(i).getAttribute('value');
    if (val && val !== 'dump' && val !== 'citations') {
      picked = val;
      break;
    }
  }
  expect(picked).not.toBeNull();

  // Selecting the doc updates the URL with its id
  await select.selectOption(picked as string);
  await page.waitForURL(new RegExp(`with=${picked}`));
});

test('split with invalid "with" param defaults to brain space', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.getByRole('link', { name: /^Abstract/ }).click();
  await page.waitForURL(new RegExp(`/s/${spaceId}/d/`));

  // Navigate to split with an invalid "with" parameter
  const docUrl = page.url();
  const splitUrl = docUrl.replace(/\/d\/[^?#]+/, '/d/' + docUrl.match(/\/d\/([^?#]+)/)?.[1] + '/split') + '?with=nonexistent_id_xyz';
  await page.goto(splitUrl);

  // Should fallback to brain space (dump)
  await page.waitForURL(/with=dump/);
  await expect(page.getByTestId('brain-canvas')).toBeVisible();
});
