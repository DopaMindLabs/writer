import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

test.beforeEach(async ({ page }) => {
  await reseedAndGoHome(page);
});

test('language tab switches the interface to Spanish and persists across reload', async ({
  page,
}) => {
  await page.goto('/#/settings?tab=language');

  await expect(page.getByRole('heading', { name: 'Language' })).toBeVisible();
  await expect(
    page.getByTestId('language-machine-translation-notice'),
  ).toBeVisible();

  const picker = page.getByLabel('Interface language');
  await expect(picker).toBeVisible();
  await picker.selectOption('es');

  await expect(page.getByRole('heading', { name: 'Idioma' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Idioma' })).toBeVisible();

  await page.getByLabel('Idioma de la interfaz').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Language' })).toBeVisible();
});

test('help landing exposes the language picker next to search', async ({
  page,
}) => {
  await page.goto('/#/help');
  const picker = page.getByTestId('help-language-picker');
  await expect(picker).toBeVisible();

  await picker.selectOption('es');
  await expect(
    page.getByRole('heading', { name: 'Ayuda', level: 1 }),
  ).toBeVisible();
});

test('help shows the machine-translation banner with a picker when locale is not English', async ({
  page,
}) => {
  await page.goto('/#/settings?tab=language');
  await page.getByLabel('Interface language').selectOption('es');

  await page.goto('/#/help/getting-started');
  const banner = page.getByTestId('help-machine-translation-banner');
  await expect(banner).toBeVisible();

  const bannerPicker = page.getByTestId('help-banner-language-picker');
  await expect(bannerPicker).toBeVisible();

  await bannerPicker.selectOption('en');
  await expect(banner).toBeHidden();
});

test('help controls stay inside a 320px viewport (search and pickers usable on mobile)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });

  await page.goto('/#/help');
  const search = page.getByTestId('help-search');
  const landingPicker = page.getByTestId('help-language-picker');
  await expect(search).toBeVisible();
  await expect(landingPicker).toBeVisible();
  const searchBox = await search.boundingBox();
  const pickerBox = await landingPicker.boundingBox();
  expect(searchBox).not.toBeNull();
  expect(pickerBox).not.toBeNull();
  expect(searchBox!.x + searchBox!.width).toBeLessThanOrEqual(320);
  expect(pickerBox!.x + pickerBox!.width).toBeLessThanOrEqual(320);
  expect(searchBox!.width).toBeGreaterThan(150);

  await landingPicker.selectOption('es');
  await page.goto('/#/help/getting-started');
  const bannerPicker = page.getByTestId('help-banner-language-picker');
  await expect(bannerPicker).toBeVisible();
  const bannerPickerBox = await bannerPicker.boundingBox();
  expect(bannerPickerBox).not.toBeNull();
  expect(bannerPickerBox!.x + bannerPickerBox!.width).toBeLessThanOrEqual(320);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
