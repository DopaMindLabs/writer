import enCommon from './locales/en/common.json';
import enChrome from './locales/en/chrome.json';
import enScreens from './locales/en/screens.json';
import enApp from './locales/en/app.json';
import enTemplates from './locales/en/templates.json';

export const resources = {
  en: {
    common: enCommon,
    chrome: enChrome,
    screens: enScreens,
    app: enApp,
    templates: enTemplates,
  },
} as const;

export const defaultNS = 'common';
export const supportedLngs = ['en'] as const;
