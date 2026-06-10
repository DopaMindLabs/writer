import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

// Playwright isolates browser contexts per `test()` (no `storageState` in
// playwright.config.ts, no shared `browser.newContext()`), so localStorage
// starts empty for every test. No init-script clearing is needed — and would
// in fact break the persistence assertion below by wiping the choice on
// `page.reload()` before the i18n module can read it back.

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

  // The header re-renders in Spanish.
  await expect(page.getByRole('heading', { name: 'Idioma' })).toBeVisible();

  // Reload — the choice persists via localStorage.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Idioma' })).toBeVisible();

  // Switch back to English via the same picker.
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
  // Start in Spanish from Settings so the help screen mounts in es.
  await page.goto('/#/settings?tab=language');
  await page.getByLabel('Interface language').selectOption('es');

  // Now go to an article — the banner should appear above it.
  await page.goto('/#/help/getting-started');
  const banner = page.getByTestId('help-machine-translation-banner');
  await expect(banner).toBeVisible();

  const bannerPicker = page.getByTestId('help-banner-language-picker');
  await expect(bannerPicker).toBeVisible();

  // Switching back to English from the banner removes it on the next render.
  await bannerPicker.selectOption('en');
  await expect(banner).toBeHidden();
});

test('help controls stay inside a 320px viewport (search and pickers usable on mobile)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });

  // Landing: search field and language picker both fit without overflow.
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
  // The search field keeps a usable width rather than being squeezed.
  expect(searchBox!.width).toBeGreaterThan(150);

  // Machine-translation banner: its picker also stacks and fits.
  await landingPicker.selectOption('es');
  await page.goto('/#/help/getting-started');
  const bannerPicker = page.getByTestId('help-banner-language-picker');
  await expect(bannerPicker).toBeVisible();
  const bannerPickerBox = await bannerPicker.boundingBox();
  expect(bannerPickerBox).not.toBeNull();
  expect(bannerPickerBox!.x + bannerPickerBox!.width).toBeLessThanOrEqual(320);

  // No horizontal page overflow anywhere on the article view.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
