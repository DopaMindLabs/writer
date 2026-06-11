import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import {
  reseedAndGoHome,
  getFirstSpaceIdFromHome,
  createSpaceFromTemplate,
} from './_helpers';

const draftProbe = async (
  page: Page,
  spaceId: string,
  probe: string,
): Promise<void> => {
  await page.goto(`/?n=${Date.now()}#/s/${spaceId}`);
  await page.waitForURL(new RegExp(`/s/${spaceId}/d/`));
  const editor = page.locator('[aria-label="Document body"]');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.type(probe);
  await expect(editor).toContainText(probe);
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

    await page.goto(`/?n=${Date.now()}#/s/${spaceA}`);
    await page.waitForURL(new RegExp(`/s/${spaceA}/d/`));
    const editor = page.locator('[aria-label="Document body"]');
    await expect(editor).toContainText(probeA);

    await page.getByTestId(`space-rail-space-${spaceB}`).click();
    await page.waitForURL(new RegExp(`/s/${spaceB}/d/`));
    await expect(editor).toBeVisible();

    await expect(editor).toContainText(probeB);
    await expect(editor).not.toContainText(probeA);
  });
});
