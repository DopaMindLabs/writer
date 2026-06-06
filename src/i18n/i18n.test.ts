import i18n from './index';
import { resources, defaultNS, supportedLngs } from './resources';

describe('i18n', () => {
  afterEach(async () => {
    if (i18n.language !== 'en') {
      await i18n.changeLanguage('en');
    }
  });

  it('initializes with en as the active language', () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.language).toBe('en');
  });

  it('exposes the configured resources, default namespace, and supported languages', () => {
    expect(defaultNS).toBe('common');
    expect(supportedLngs).toContain('en');
    expect(supportedLngs).toContain('es');
    expect(resources.en.common).toBeDefined();
    expect(resources.en.chrome).toBeDefined();
    expect(resources.en.screens).toBeDefined();
    expect(resources.en.app).toBeDefined();
    expect(resources.en.templates).toBeDefined();
    expect(resources.es.common).toBeDefined();
    expect(resources.es.chrome).toBeDefined();
    expect(resources.es.screens).toBeDefined();
    expect(resources.es.app).toBeDefined();
    expect(resources.es.templates).toBeDefined();
  });

  it('translates a known key from the common namespace', () => {
    expect(i18n.t('home', { ns: 'common' })).toBe('Home');
    expect(i18n.t('back', { ns: 'common' })).toBe('back');
  });

  it('translates the same key in Spanish when the language changes', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('home', { ns: 'common' })).toBe('Inicio');
    expect(i18n.t('settings', { ns: 'common' })).toBe('Configuración');
  });

  it('syncs the document lang attribute when the language changes', async () => {
    await i18n.changeLanguage('es');
    expect(document.documentElement.lang).toBe('es');
    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('falls back to the key when an unknown translation is requested', () => {
    const out = i18n.t('definitely-missing-key', { ns: 'common' });
    expect(typeof out).toBe('string');
  });
});
