import type { Page } from '@playwright/test';
import { test, expect } from './_helpers';
import {
  reseedAndGoHome,
  getFirstSpaceIdFromHome,
  createSpaceFromTemplate,
} from './_helpers';

interface SpaceProbe {
  id: string;
  probe: string;
  docPath: string;
}

const hardGoto = async (page: Page, hash: string): Promise<void> => {
  await page.goto(`/?n=${Date.now()}#${hash}`);
};

const draftProbe = async (page: Page, sp: SpaceProbe): Promise<void> => {
  await hardGoto(page, `/s/${sp.id}`);
  await page.waitForURL(new RegExp(`/s/${sp.id}/d/`));
  sp.docPath = new URL(page.url()).hash;
  const editor = page.locator('[aria-label="Document body"]');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.type(sp.probe);
  await expect(editor).toContainText(sp.probe);
  await page.waitForTimeout(1000);
};

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test.describe('Workflow: switching between spaces stays isolated', () => {
  test('draft in three template spaces, switch via the rail, and keep content isolated', async ({
    page,
  }) => {
    const spaces: SpaceProbe[] = [];

    await test.step('Given three spaces created from different templates', async () => {
      const bioId = await getFirstSpaceIdFromHome(page);
      const humId = await createSpaceFromTemplate(page, 'humanities', {
        name: 'Humanities space',
        tag: 'HUM',
      });
      const ficId = await createSpaceFromTemplate(page, 'fiction', {
        name: 'Fiction space',
        tag: 'FIC',
      });
      const stamp = Date.now();
      spaces.push(
        { id: bioId, probe: `bio-${stamp}`, docPath: '' },
        { id: humId, probe: `hum-${stamp}`, docPath: '' },
        { id: ficId, probe: `fic-${stamp}`, docPath: '' },
      );
    });

    await test.step('When the writer drafts distinct content in each space', async () => {
      for (const sp of spaces) {
        await draftProbe(page, sp);
      }
    });

    await test.step('And the SpaceRail lists all three and switches between them', async () => {
      await expect(
        page.locator('[data-testid^="space-rail-space-"]'),
      ).toHaveCount(spaces.length);
      for (const sp of spaces) {
        await page.getByTestId(`space-rail-space-${sp.id}`).click();
        await page.waitForURL(new RegExp(`/s/${sp.id}`));
      }
    });

    await test.step('Then each space shows only its own content', async () => {
      for (const sp of spaces) {
        await hardGoto(page, sp.docPath.replace(/^#/, ''));
        await page.waitForURL(new RegExp(`/s/${sp.id}/d/`));
        const editor = page.locator('[aria-label="Document body"]');
        await expect(editor).toContainText(sp.probe);
        for (const other of spaces) {
          if (other.probe === sp.probe) continue;
          await expect(editor).not.toContainText(other.probe);
        }
      }
    });
  });
});
