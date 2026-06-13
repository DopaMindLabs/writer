import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('split view shows right-pane select and can pick brain space', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  // Navigate to split
  await page.locator('a[href*="/split"]').first().click();
  await page.waitForURL(/\/split/);

  const select = page.getByTestId('split-right-pane-select');
  await expect(select).toBeVisible();

  // Select Brain space option
  await select.selectOption('dump');
  await expect(page.getByTestId('brain-canvas')).toBeVisible();
});

test('split view can pick citations pane', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  await page.locator('a[href*="/split"]').first().click();
  await page.waitForURL(/\/split/);

  const select = page.getByTestId('split-right-pane-select');
  await select.selectOption('citations');
  await expect(page.getByTestId('citations-pane')).toBeVisible();
});

test('split divider responds to keyboard ArrowLeft and ArrowRight', async ({
  page,
}) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  await page.locator('a[href*="/split"]').first().click();
  await page.waitForURL(/\/split/);

  const divider = page.getByTestId('split-divider');
  await expect(divider).toBeVisible();

  await divider.focus();
  const initial = Number(await divider.getAttribute('aria-valuenow'));

  await divider.press('ArrowRight');
  const after = Number(await divider.getAttribute('aria-valuenow'));
  expect(after).toBe(initial + 2);

  await divider.press('ArrowLeft');
  const reverted = Number(await divider.getAttribute('aria-valuenow'));
  expect(reverted).toBe(initial);
});

test('split divider double-click snaps to center', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  await page.locator('a[href*="/split"]').first().click();
  await page.waitForURL(/\/split/);

  const divider = page.getByTestId('split-divider');
  await expect(divider).toBeVisible();

  // Resize first
  await divider.focus();
  await divider.press('ArrowRight');
  await divider.press('ArrowRight');
  await divider.press('ArrowRight');

  // Double-click to snap
  await divider.dblclick();
  const afterSnap = Number(await divider.getAttribute('aria-valuenow'));
  expect(afterSnap).toBe(50);
});

test('split divider can be dragged with pointer', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  await page.locator('a[href*="/split"]').first().click();
  await page.waitForURL(/\/split/);

  const divider = page.getByTestId('split-divider');
  await expect(divider).toBeVisible();
  const box = await divider.boundingBox();
  expect(box).not.toBeNull();

  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 50, cy, { steps: 5 });
    await page.mouse.up();

    const afterDrag = Number(await divider.getAttribute('aria-valuenow'));
    expect(afterDrag).toBeGreaterThan(50);
  }
});

test('split right pane select picks a different doc', async ({ page }) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);

  await page.locator('a[href*="/split"]').first().click();
  await page.waitForURL(/\/split/);

  const select = page.getByTestId('split-right-pane-select');

  // The candidate docs are loaded asynchronously, so wait until a real doc
  // option appears — i.e. one whose value is a doc id, not the brain-space
  // ('dump') / citations placeholders — before selecting it. Reading the
  // options too early can capture the transient "(no other docs)" entry, which
  // then disappears once the docs load.
  await expect
    .poll(() =>
      select.locator('option').evaluateAll((opts) =>
        (opts as HTMLOptionElement[]).some(
          (o) => o.value !== '' && o.value !== 'dump' && o.value !== 'citations',
        ),
      ),
    )
    .toBe(true);

  const docValue = await select.locator('option').evaluateAll((opts) => {
    const real = (opts as HTMLOptionElement[]).find(
      (o) => o.value !== '' && o.value !== 'dump' && o.value !== 'citations',
    );
    return real?.value ?? null;
  });
  expect(docValue).not.toBeNull();

  await select.selectOption(docValue as string);
  // URL should update with that doc as the right pane (the query lives in the
  // hash fragment under the hash router).
  await page.waitForURL((url) => url.hash.includes(`with=${docValue}`));
});
