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

// Tier 2+ — common.json only for now; other namespaces fall back to English.
import itCommon from './locales/it/common.json';
import plCommon from './locales/pl/common.json';
import svCommon from './locales/sv/common.json';
import daCommon from './locales/da/common.json';
import nbCommon from './locales/nb/common.json';
import isCommon from './locales/is/common.json';
import gaCommon from './locales/ga/common.json';
import ltCommon from './locales/lt/common.json';
import lvCommon from './locales/lv/common.json';
import etCommon from './locales/et/common.json';
import csCommon from './locales/cs/common.json';
import huCommon from './locales/hu/common.json';
import roCommon from './locales/ro/common.json';
import bgCommon from './locales/bg/common.json';
import elCommon from './locales/el/common.json';
import jaCommon from './locales/ja/common.json';
import zhHansCommon from './locales/zh-Hans/common.json';
import koCommon from './locales/ko/common.json';
import hiCommon from './locales/hi/common.json';
import taCommon from './locales/ta/common.json';
import siCommon from './locales/si/common.json';
import amCommon from './locales/am/common.json';
import swCommon from './locales/sw/common.json';
import haCommon from './locales/ha/common.json';
import yoCommon from './locales/yo/common.json';
import zuCommon from './locales/zu/common.json';
import miCommon from './locales/mi/common.json';
import smCommon from './locales/sm/common.json';
import toCommon from './locales/to/common.json';

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
  it: { common: itCommon },
  pl: { common: plCommon },
  sv: { common: svCommon },
  da: { common: daCommon },
  nb: { common: nbCommon },
  is: { common: isCommon },
  ga: { common: gaCommon },
  lt: { common: ltCommon },
  lv: { common: lvCommon },
  et: { common: etCommon },
  cs: { common: csCommon },
  hu: { common: huCommon },
  ro: { common: roCommon },
  bg: { common: bgCommon },
  el: { common: elCommon },
  ja: { common: jaCommon },
  'zh-Hans': { common: zhHansCommon },
  ko: { common: koCommon },
  hi: { common: hiCommon },
  ta: { common: taCommon },
  si: { common: siCommon },
  am: { common: amCommon },
  sw: { common: swCommon },
  ha: { common: haCommon },
  yo: { common: yoCommon },
  zu: { common: zuCommon },
  mi: { common: miCommon },
  sm: { common: smCommon },
  to: { common: toCommon },
} as const;

export const defaultNS = 'common';
