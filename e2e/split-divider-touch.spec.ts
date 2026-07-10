// Mobile split has no tab in the bottom bar for now (deferred to its own PR),
// but the /split route still stacks on portrait phones when reached by URL.
// This guards the divider's touch-drag mechanics under Chromium touch
// emulation so the dormant code stays working for the follow-up PR.
import { test, expect } from './_helpers';
import { reseedAndGoHome, getFirstSpaceIdFromHome } from './_helpers';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

const openStackedSplit = async (page: import('@playwright/test').Page) => {
  const spaceId = await getFirstSpaceIdFromHome(page);
  await page.goto(`/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const docId = new URL(page.url()).hash.match(/\/d\/([^/?]+)/)?.[1];
  await page.goto(`/#/s/${spaceId}/d/${docId}/split`);
  await page.waitForURL(/with=dump/);
};

test('divider can be dragged with touch in stacked (portrait) mode', async ({
  page,
}) => {
  await openStackedSplit(page);

  const separator = page.getByRole('separator', {
    name: /Resize split panes/i,
  });
  await expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
  const before = Number(await separator.getAttribute('aria-valuenow'));

  const box = await separator.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: startY }],
  });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: startY + i * 15 }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });

  await expect
    .poll(async () => Number(await separator.getAttribute('aria-valuenow')))
    .toBeGreaterThan(before + 5);
});
