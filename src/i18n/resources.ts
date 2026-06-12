import { invariant } from '@/lib/invariant';

export const supportedLngs = [
  'en',
  'es',
  'pt-BR',
  'pt-PT',
  'fr',
  'de',
  'nl',
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
  'cs',
  'hu',
  'ro',
  'bg',
  'el',
  'ja',
  'zh-Hans',
  'ko',
  'hi',
  'ta',
  'si',
  'sw',
  'ha',
  'yo',
  'am',
  'zu',
  'mi',
  'sm',
  'to',
] as const;

export const translationNamespaces = [
  'common',
  'chrome',
  'screens',
  'app',
  'templates',
  'tours',
  'help',
] as const;

type NSResource = Record<string, unknown>;
type Namespace = (typeof translationNamespaces)[number];
type SupportedLng = (typeof supportedLngs)[number];
type LocaleResources = Record<Namespace, NSResource>;

const localeModules = import.meta.glob<NSResource>('./locales/*/*.json', {
  eager: true,
  import: 'default',
});

const getLocaleResource = (
  lng: SupportedLng,
  namespace: Namespace,
): NSResource => {
  const path = `./locales/${lng}/${namespace}.json`;
  const resource = localeModules[path];
  invariant(resource, () => `Missing i18n resource: ${path}`);
  return resource;
};

const buildLocaleResources = (lng: SupportedLng): LocaleResources =>
  Object.fromEntries(
    translationNamespaces.map((namespace) => [
      namespace,
      getLocaleResource(lng, namespace),
    ]),
  ) as LocaleResources;

const buildResources = (): Record<SupportedLng, LocaleResources> =>
  Object.fromEntries(
    supportedLngs.map((lng) => [lng, buildLocaleResources(lng)]),
  ) as Record<SupportedLng, LocaleResources>;

export const resources = buildResources();

export const defaultNS = 'common';
