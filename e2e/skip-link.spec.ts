import { test, expect, reseedAndGoHome } from './_helpers';

test.describe('Skip to content link', () => {
  test('is hidden until focused, then moves focus to the main landmark', async ({
    page,
  }) => {
    await reseedAndGoHome(page);

    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();

    await skip.press('Enter');
    const main = page.locator('#main-content');
    await expect(main).toBeVisible();
    await expect(main).toBeFocused();
  });
});
