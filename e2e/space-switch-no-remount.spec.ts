import { test, expect } from './_helpers';
import {
  reseedAndGoHome,
  getFirstSpaceIdFromHome,
  createSpaceFromTemplate,
} from './_helpers';

// Switching spaces via the SpaceRail must NOT remount the surrounding chrome
// (rail, sidebar, topbar). Returning a <Navigate> to redirect `/s/:spaceId` to
// its first doc used to unmount and remount the whole screen for a frame, which
// read as the page "reloading" on every switch. We assert the chrome's DOM
// nodes survive the navigation by checking they stay connected to the document.
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

    // Land on space A's first doc.
    await page.goto(`/?n=${Date.now()}#/s/${spaceA}`);
    await page.waitForURL(new RegExp(`/s/${spaceA}/d/`));
    await expect(page.locator('[aria-label="Document body"]')).toBeVisible();

    // Capture the live chrome nodes before switching.
    const rail = await page.locator('aside').first().elementHandle();
    const sidebarNav = await page
      .locator('nav[data-tour="tour-sidebar-sections"]')
      .elementHandle();
    const header = await page.locator('header').first().elementHandle();
    expect(rail).not.toBeNull();
    expect(sidebarNav).not.toBeNull();
    expect(header).not.toBeNull();

    // Switch to space B via the rail (the user's action).
    await page.getByTestId(`space-rail-space-${spaceB}`).click();
    await page.waitForURL(new RegExp(`/s/${spaceB}/d/`));
    await expect(page.locator('[aria-label="Document body"]')).toBeVisible();

    // The same DOM nodes must still be connected — i.e. reconciled in place,
    // not unmounted and replaced. A remount disconnects the captured nodes.
    expect(await rail!.evaluate((el) => el.isConnected)).toBe(true);
    expect(await sidebarNav!.evaluate((el) => el.isConnected)).toBe(true);
    expect(await header!.evaluate((el) => el.isConnected)).toBe(true);

    // And the rail reflects the new active space.
    await expect(page.getByTestId(`space-rail-space-${spaceB}`)).toHaveClass(
      /bg-ink/,
    );
  });
});
