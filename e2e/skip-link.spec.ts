import { test, expect, reseedAndGoHome } from './_helpers';

test.describe('Skip to content link', () => {
  test('is hidden until focused, then moves focus to the main landmark', async ({
    page,
  }) => {
    await reseedAndGoHome(page);

    const skip = page.getByRole('link', { name: 'Skip to content' });
    // Present in the DOM but visually hidden (sr-only) until focused.
    await expect(skip).toHaveCount(1);

    // Tabbing from the document start reveals it as the first focusable element.
    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();

    // Activating it sends focus to the page's main landmark.
    await skip.press('Enter');
    const main = page.locator('#main-content');
    await expect(main).toBeVisible();
    await expect(main).toBeFocused();
  });
});
