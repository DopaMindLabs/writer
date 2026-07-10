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
const HEADING_RE =
  /^(?<hashes>#{2,3})\s+(?<text>.+?)(?:\s+\{#(?<id>[^}\s]+)\})?\s*$/;

interface HeadingMatch {
  readonly hashes: string;
  readonly text: string;
  readonly id: string | undefined;
}

const matchHeading = (line: string): HeadingMatch | undefined => {
  const match = HEADING_RE.exec(line);
  if (!match?.groups) return undefined;
  const groups = match.groups as { hashes: string; text: string; id?: string };
  return { hashes: groups.hashes, text: groups.text, id: groups.id };
};

const extractHeadings = (body: string): HelpHeading[] => {
  const headings: HelpHeading[] = [];
  for (const line of body.split('\n')) {
    const heading = matchHeading(line);
    if (!heading) continue;
    const depth = heading.hashes.length as 2 | 3;
    headings.push({ id: heading.id ?? slugify(heading.text), depth, text: heading.text });
  }
  return headings;
};

const alignBodyToEnglishSlugs = (
  body: string,
  englishSlugs: readonly string[],
): string => {
  let i = 0;
  return body
    .split('\n')
    .map((line) => {
      const heading = matchHeading(line);
      if (!heading) return line;
      const index = i;
      i += 1;
      if (heading.id !== undefined || index >= englishSlugs.length) return line;
      const englishSlug = englishSlugs[index];
      return `${heading.hashes} ${heading.text} {#${englishSlug}}`;
    })
    .join('\n');
};

const parseInternal = (slug: string, raw: string): HelpDoc => {
  const titleMatch = TITLE_RE.exec(raw);
  invariant(titleMatch, () => `help article ${slug} is missing an h1 title`);
  const title = titleMatch[1];
  const body = raw.replace(TITLE_RE, '').trim();
  return { slug, title, body, headings: extractHeadings(body) };
};

const englishDocs = ((): Map<string, HelpDoc> => {
  const out = new Map<string, HelpDoc>();
  const englishLocale = byLocale.get(FALLBACK_LOCALE);
  if (!englishLocale) return out;
  for (const [slug, raw] of englishLocale) {
    out.set(slug, parseInternal(slug, raw));
  }
  return out;
})();

const parse = (slug: string, raw: string, locale: string): HelpDoc => {
  if (locale === FALLBACK_LOCALE) return parseInternal(slug, raw);
  const englishDoc = englishDocs.get(slug);
  if (!englishDoc) return parseInternal(slug, raw);
  const titleMatch = TITLE_RE.exec(raw);
  invariant(titleMatch, () => `help article ${slug} is missing an h1 title`);
  const title = titleMatch[1];
  const rawBody = raw.replace(TITLE_RE, '').trim();
  const englishSlugs = englishDoc.headings.map((h) => h.id);
  const body = alignBodyToEnglishSlugs(rawBody, englishSlugs);
  return { slug, title, body, headings: extractHeadings(body) };
};

const resolveRaw = (
  slug: string,
  locale: string,
): { raw: string; effectiveLocale: string } | undefined => {
  const localeRaw = byLocale.get(locale)?.get(slug);
  if (localeRaw !== undefined) return { raw: localeRaw, effectiveLocale: locale };
  const fallbackRaw = byLocale.get(FALLBACK_LOCALE)?.get(slug);
  if (fallbackRaw !== undefined)
    return { raw: fallbackRaw, effectiveLocale: FALLBACK_LOCALE };
  return undefined;
};

export const getHelpDoc = (
  slug: string,
  locale: string = FALLBACK_LOCALE,
): HelpDoc | undefined => {
  const resolved = resolveRaw(slug, locale);
  if (!resolved) return undefined;
  return parse(slug, resolved.raw, resolved.effectiveLocale);
};

export const hasHelpDoc = (slug: string): boolean =>
  byLocale.get(FALLBACK_LOCALE)?.has(slug) ?? false;

export const listHelpDocSlugs = (): readonly string[] =>
  Array.from(byLocale.get(FALLBACK_LOCALE)?.keys() ?? []);
