import { test, expect } from './_helpers';
import {
  reseedAndGoHome,
  getFirstSpaceIdFromHome,
  createSpaceFromTemplate,
} from './_helpers';

test.describe('Switching spaces keeps the chrome mounted', () => {
  test('rail, sidebar and topbar are not remounted when switching via the rail', async ({
    page,
  }) => {
    await reseedAndGoHome(page);
    const spaceA = await getFirstSpaceIdFromHome(page);
    const spaceB = await createSpaceFromTemplate(page, 'humanities', {
      name: 'Humanities space',
      tag: 'HUM',
    });

    await page.goto(`/?n=${Date.now()}#/s/${spaceA}`);
    await page.waitForURL(new RegExp(`/s/${spaceA}/d/`));
    await expect(page.locator('[aria-label="Document body"]')).toBeVisible();

    const rail = await page.locator('aside').first().elementHandle();
    const sidebarNav = await page
      .locator('nav[data-tour="tour-sidebar-sections"]')
      .elementHandle();
    const header = await page.locator('header').first().elementHandle();
    expect(rail).not.toBeNull();
    expect(sidebarNav).not.toBeNull();
    expect(header).not.toBeNull();

    await page.getByTestId(`space-rail-space-${spaceB}`).click();
    await page.waitForURL(new RegExp(`/s/${spaceB}/d/`));
    await expect(page.locator('[aria-label="Document body"]')).toBeVisible();

    expect(await rail!.evaluate((el) => el.isConnected)).toBe(true);
    expect(await sidebarNav!.evaluate((el) => el.isConnected)).toBe(true);
    expect(await header!.evaluate((el) => el.isConnected)).toBe(true);

    await expect(page.getByTestId(`space-rail-space-${spaceB}`)).toHaveClass(
      /bg-ink/,
    );
  });
});
