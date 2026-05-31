import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import {
  reseedAndGoHome,
  getFirstSpaceIdFromHome,
  createSpaceFromTemplate,
} from './_helpers';

// When switching spaces via the SpaceRail (a client-side navigation), the
// stale-while-revalidate behaviour of useLiveQuery can keep the previous
// space's data live for a frame. The useKeyedLiveQuery guard must prevent
// the redirect from landing on the old space's document; the editor must
// show the *new* space's content.

const draftProbe = async (
  page: Page,
  spaceId: string,
  probe: string,
): Promise<void> => {
  // Force a full load so we get a clean Dexie state for this space.
  await page.goto(`/?n=${Date.now()}#/s/${spaceId}`);
  await page.waitForURL(new RegExp(`/s/${spaceId}/d/`));
  const editor = page.locator('[aria-label="Document body"]');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.type(probe);
  await expect(editor).toContainText(probe);
  // Autosave debounce is 600 ms — flush to IndexedDB before navigating away.
  await page.waitForTimeout(1000);
};

test.describe('Switching spaces via the rail lands on the correct space document', () => {
  test('editor shows the new space content, not the previous space content', async ({
    page,
  }) => {
    await reseedAndGoHome(page);

    const spaceA = await getFirstSpaceIdFromHome(page);
    const spaceB = await createSpaceFromTemplate(page, 'humanities', {
      name: 'Humanities space',
      tag: 'HUM',
    });

    const stamp = Date.now();
    const probeA = `probe-a-${stamp}`;
    const probeB = `probe-b-${stamp}`;

    await draftProbe(page, spaceA, probeA);
    await draftProbe(page, spaceB, probeB);

    // Land on space A via a full load (establishes the stale-data scenario).
    await page.goto(`/?n=${Date.now()}#/s/${spaceA}`);
    await page.waitForURL(new RegExp(`/s/${spaceA}/d/`));
    const editor = page.locator('[aria-label="Document body"]');
    await expect(editor).toContainText(probeA);

    // Switch to space B via the rail (client-side nav — the stale-data path).
    await page.getByTestId(`space-rail-space-${spaceB}`).click();
    await page.waitForURL(new RegExp(`/s/${spaceB}/d/`));
    await expect(editor).toBeVisible();

    // The editor must show B's content, not A's stale content.
    await expect(editor).toContainText(probeB);
    await expect(editor).not.toContainText(probeA);
  });
});
