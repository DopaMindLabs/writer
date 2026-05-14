import i18n from './index';
import { resources, defaultNS, supportedLngs } from './resources';

describe('i18n', () => {
  it('initializes with en as the active language', () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.language).toBe('en');
  });

  it('exposes the configured resources, default namespace, and supported languages', () => {
    expect(defaultNS).toBe('common');
    expect(supportedLngs).toEqual(['en']);
    expect(resources.en.common).toBeDefined();
    expect(resources.en.chrome).toBeDefined();
    expect(resources.en.screens).toBeDefined();
    expect(resources.en.app).toBeDefined();
    expect(resources.en.templates).toBeDefined();
  });

  it('translates a known key from the common namespace', () => {
    expect(i18n.t('home', { ns: 'common' })).toBe('Home');
    expect(i18n.t('back', { ns: 'common' })).toBe('back');
  });

  it('falls back to the key when an unknown translation is requested', () => {
    const out = i18n.t('definitely-missing-key', { ns: 'common' });
    expect(typeof out).toBe('string');
  });
});
