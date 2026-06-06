import enCommon from './locales/en/common.json';
import enChrome from './locales/en/chrome.json';
import enScreens from './locales/en/screens.json';
import enApp from './locales/en/app.json';
import enTemplates from './locales/en/templates.json';
import enTours from './locales/en/tours.json';
import enHelp from './locales/en/help.json';

import esCommon from './locales/es/common.json';
import esChrome from './locales/es/chrome.json';
import esScreens from './locales/es/screens.json';
import esApp from './locales/es/app.json';
import esTemplates from './locales/es/templates.json';
import esTours from './locales/es/tours.json';
import esHelp from './locales/es/help.json';

export const resources = {
  en: {
    common: enCommon,
    chrome: enChrome,
    screens: enScreens,
    app: enApp,
    templates: enTemplates,
    tours: enTours,
    help: enHelp,
  },
  es: {
    common: esCommon,
    chrome: esChrome,
    screens: esScreens,
    app: esApp,
    templates: esTemplates,
    tours: esTours,
    help: esHelp,
  },
} as const;

export const defaultNS = 'common';
export const supportedLngs = ['en', 'es'] as const;
