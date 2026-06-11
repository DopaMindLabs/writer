import { test, expect, reseedAndGoHome } from './_helpers';

test.use({ viewport: { width: 390, height: 800 } });

test('the new-space screen fits a phone viewport without scrolling', async ({
  page,
}) => {
  await reseedAndGoHome(page);
  await page
    .getByRole('link', { name: /Start a new space|Create new space/i })
    .first()
    .click();
  await expect(page.getByTestId('templates-screen')).toBeVisible();

  // Every template card and the sticky footer form must be reachable
  // without scrolling on a small phone.
  const cards = page.locator('[data-testid^="templates-card-"]');
  await expect(cards.first()).toBeInViewport();
  await expect(cards.last()).toBeInViewport();
  await expect(page.getByTestId('templates-name-input')).toBeInViewport();
  await expect(page.getByTestId('templates-tag-input')).toBeInViewport();
  await expect(page.getByTestId('templates-submit')).toBeInViewport();
});
