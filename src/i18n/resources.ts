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

import frCommon from './locales/fr/common.json';
import frChrome from './locales/fr/chrome.json';
import frApp from './locales/fr/app.json';
import frTemplates from './locales/fr/templates.json';
import frTours from './locales/fr/tours.json';
import frHelp from './locales/fr/help.json';

import deCommon from './locales/de/common.json';
import deChrome from './locales/de/chrome.json';
import deApp from './locales/de/app.json';
import deTemplates from './locales/de/templates.json';
import deTours from './locales/de/tours.json';
import deHelp from './locales/de/help.json';

import nlCommon from './locales/nl/common.json';
import nlChrome from './locales/nl/chrome.json';
import nlApp from './locales/nl/app.json';
import nlTemplates from './locales/nl/templates.json';
import nlTours from './locales/nl/tours.json';
import nlHelp from './locales/nl/help.json';

import ptBRCommon from './locales/pt-BR/common.json';
import ptBRChrome from './locales/pt-BR/chrome.json';
import ptBRApp from './locales/pt-BR/app.json';
import ptBRTemplates from './locales/pt-BR/templates.json';
import ptBRTours from './locales/pt-BR/tours.json';
import ptBRHelp from './locales/pt-BR/help.json';

import ptPTCommon from './locales/pt-PT/common.json';
import ptPTChrome from './locales/pt-PT/chrome.json';
import ptPTApp from './locales/pt-PT/app.json';
import ptPTTemplates from './locales/pt-PT/templates.json';
import ptPTTours from './locales/pt-PT/tours.json';
import ptPTHelp from './locales/pt-PT/help.json';

// Tier 2+ — common + app translated; other namespaces fall back to English.
import itCommon from './locales/it/common.json';
import itApp from './locales/it/app.json';
import plCommon from './locales/pl/common.json';
import plApp from './locales/pl/app.json';
import svCommon from './locales/sv/common.json';
import svApp from './locales/sv/app.json';
import daCommon from './locales/da/common.json';
import daApp from './locales/da/app.json';
import nbCommon from './locales/nb/common.json';
import nbApp from './locales/nb/app.json';
import isCommon from './locales/is/common.json';
import isApp from './locales/is/app.json';
import gaCommon from './locales/ga/common.json';
import gaApp from './locales/ga/app.json';
import ltCommon from './locales/lt/common.json';
import ltApp from './locales/lt/app.json';
import lvCommon from './locales/lv/common.json';
import lvApp from './locales/lv/app.json';
import etCommon from './locales/et/common.json';
import etApp from './locales/et/app.json';
import csCommon from './locales/cs/common.json';
import csApp from './locales/cs/app.json';
import huCommon from './locales/hu/common.json';
import huApp from './locales/hu/app.json';
import roCommon from './locales/ro/common.json';
import roApp from './locales/ro/app.json';
import bgCommon from './locales/bg/common.json';
import bgApp from './locales/bg/app.json';
import elCommon from './locales/el/common.json';
import elApp from './locales/el/app.json';
import jaCommon from './locales/ja/common.json';
import jaApp from './locales/ja/app.json';
import zhHansCommon from './locales/zh-Hans/common.json';
import zhHansApp from './locales/zh-Hans/app.json';
import koCommon from './locales/ko/common.json';
import koApp from './locales/ko/app.json';
import hiCommon from './locales/hi/common.json';
import hiApp from './locales/hi/app.json';
import taCommon from './locales/ta/common.json';
import taApp from './locales/ta/app.json';
import siCommon from './locales/si/common.json';
import siApp from './locales/si/app.json';
import amCommon from './locales/am/common.json';
import amApp from './locales/am/app.json';
import swCommon from './locales/sw/common.json';
import swApp from './locales/sw/app.json';
import haCommon from './locales/ha/common.json';
import haApp from './locales/ha/app.json';
import yoCommon from './locales/yo/common.json';
import yoApp from './locales/yo/app.json';
import zuCommon from './locales/zu/common.json';
import zuApp from './locales/zu/app.json';
import miCommon from './locales/mi/common.json';
import miApp from './locales/mi/app.json';
import smCommon from './locales/sm/common.json';
import smApp from './locales/sm/app.json';
import toCommon from './locales/to/common.json';
import toApp from './locales/to/app.json';

/**
 * Locales the user can pick. Any locale here without a `resources` entry below
 * (or with a partial entry) falls back to English for missing keys — that's
 * i18next's built-in behaviour, gated by `fallbackLng`. The help-centre banner
 * and the Settings disclaimer make the partial state visible to the user.
 *
 * Tiered in chronological order of authoring effort. Native-speaker review is
 * required before any of these locales should be treated as production-quality.
 */
export const supportedLngs = [
  'en',
  // Tier 1 — Western Europe baseline
  'es',
  'pt-BR',
  'pt-PT',
  'fr',
  'de',
  'nl',
  // Tier 2 — wider Europe (Latin)
  'it',
  'pl',
  'sv',
  'da',
  'nb',
  'is',
  'ga',
  'lt',
  'lv',
  'et',
  // Tier 3 — Central/SE Europe
  'cs',
  'hu',
  'ro',
  'bg',
  'el',
  // Tier 4 — East/South Asia
  'ja',
  'zh-Hans',
  'ko',
  'hi',
  'ta',
  'si',
  // Tier 5 — Africa
  'sw',
  'ha',
  'yo',
  'am',
  'zu',
  // Tier 6 — Polynesia
  'mi',
  'sm',
  'to',
] as const;

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
  fr: {
    common: frCommon,
    chrome: frChrome,
    app: frApp,
    templates: frTemplates,
    tours: frTours,
    help: frHelp,
  },
  de: {
    common: deCommon,
    chrome: deChrome,
    app: deApp,
    templates: deTemplates,
    tours: deTours,
    help: deHelp,
  },
  nl: {
    common: nlCommon,
    chrome: nlChrome,
    app: nlApp,
    templates: nlTemplates,
    tours: nlTours,
    help: nlHelp,
  },
  'pt-BR': {
    common: ptBRCommon,
    chrome: ptBRChrome,
    app: ptBRApp,
    templates: ptBRTemplates,
    tours: ptBRTours,
    help: ptBRHelp,
  },
  'pt-PT': {
    common: ptPTCommon,
    chrome: ptPTChrome,
    app: ptPTApp,
    templates: ptPTTemplates,
    tours: ptPTTours,
    help: ptPTHelp,
  },
  it: { common: itCommon, app: itApp },
  pl: { common: plCommon, app: plApp },
  sv: { common: svCommon, app: svApp },
  da: { common: daCommon, app: daApp },
  nb: { common: nbCommon, app: nbApp },
  is: { common: isCommon, app: isApp },
  ga: { common: gaCommon, app: gaApp },
  lt: { common: ltCommon, app: ltApp },
  lv: { common: lvCommon, app: lvApp },
  et: { common: etCommon, app: etApp },
  cs: { common: csCommon, app: csApp },
  hu: { common: huCommon, app: huApp },
  ro: { common: roCommon, app: roApp },
  bg: { common: bgCommon, app: bgApp },
  el: { common: elCommon, app: elApp },
  ja: { common: jaCommon, app: jaApp },
  'zh-Hans': { common: zhHansCommon, app: zhHansApp },
  ko: { common: koCommon, app: koApp },
  hi: { common: hiCommon, app: hiApp },
  ta: { common: taCommon, app: taApp },
  si: { common: siCommon, app: siApp },
  am: { common: amCommon, app: amApp },
  sw: { common: swCommon, app: swApp },
  ha: { common: haCommon, app: haApp },
  yo: { common: yoCommon, app: yoApp },
  zu: { common: zuCommon, app: zuApp },
  mi: { common: miCommon, app: miApp },
  sm: { common: smCommon, app: smApp },
  to: { common: toCommon, app: toApp },
} as const;

export const defaultNS = 'common';
