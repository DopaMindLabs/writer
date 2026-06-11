import { invariant } from '@/lib/invariant';

export const FALLBACK_LOCALE = 'en';

export interface HelpHeading {
  readonly id: string;
  readonly depth: 2 | 3;
  readonly text: string;
}

export interface HelpDoc {
  readonly slug: string;
  readonly title: string;
  readonly body: string;
  readonly headings: readonly HelpHeading[];
}

const rawModules = import.meta.glob('../../help/content/*/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const byLocale = ((): Map<string, Map<string, string>> => {
  const out = new Map<string, Map<string, string>>();
  for (const [key, raw] of Object.entries(rawModules)) {
    const match = /\/content\/([^/]+)\/([^/]+)\.md$/.exec(key);
    if (!match || typeof raw !== 'string') continue;
    const [, locale, slug] = match;
    const localeMap = out.get(locale) ?? new Map<string, string>();
    localeMap.set(slug, raw);
    out.set(locale, localeMap);
  }
  return out;
})();

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\da-z\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const TITLE_RE = /^#\s+(.+?)\s*$/m;

const extractHeadings = (body: string): HelpHeading[] => {
  const lines = body.split('\n');
  const headings: HelpHeading[] = [];
  for (const line of lines) {
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const text = match[2];
    headings.push({ id: slugify(text), depth: match[1].length as 2 | 3, text });
  }
  return headings;
};

const parse = (slug: string, raw: string): HelpDoc => {
  const titleMatch = TITLE_RE.exec(raw);
  invariant(titleMatch, () => `help article ${slug} is missing an h1 title`);
  const title = titleMatch[1];
  const body = raw.replace(TITLE_RE, '').trim();
  return { slug, title, body, headings: extractHeadings(body) };
};

const resolveRaw = (slug: string, locale: string): string | undefined =>
  byLocale.get(locale)?.get(slug) ?? byLocale.get(FALLBACK_LOCALE)?.get(slug);

export const getHelpDoc = (
  slug: string,
  locale: string = FALLBACK_LOCALE,
): HelpDoc | undefined => {
  const raw = resolveRaw(slug, locale);
  if (raw === undefined) return undefined;
  return parse(slug, raw);
};

export const hasHelpDoc = (slug: string): boolean =>
  byLocale.get(FALLBACK_LOCALE)?.has(slug) ?? false;

export const listHelpDocSlugs = (): readonly string[] =>
  Array.from(byLocale.get(FALLBACK_LOCALE)?.keys() ?? []);
