import { test, expect } from './_helpers';
import { reseedAndGoHome } from './_helpers';

const LANGUAGE_KEY = 'lipsum:language';

const clearLanguage = async (
  page: import('@playwright/test').Page,
): Promise<void> => {
  await page.addInitScript((key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }, LANGUAGE_KEY);
};

test.beforeEach(async ({ page }) => {
  await clearLanguage(page);
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

  // Reset for the next test.
  await page.getByTestId('help-language-picker').selectOption('en');
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
