import { HELP_ARTICLES } from './registry';
import { FALLBACK_LOCALE, getHelpDoc } from './content';

/**
 * Lightweight client-side help search. Scores each article against the query
 * tokens across weighted fields (title > keywords > headings > body). No index
 * is persisted; the corpus is small and rebuilt per call for the active locale.
 */

export interface HelpSearchResult {
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  /** A short body excerpt around the first match, for result previews. */
  readonly excerpt: string;
  readonly score: number;
}

interface IndexedArticle {
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly keywords: string;
  readonly headings: string;
  readonly body: string;
}

const buildIndex = (locale: string): readonly IndexedArticle[] =>
  HELP_ARTICLES.flatMap((meta) => {
    const doc = getHelpDoc(meta.slug, locale);
    if (!doc) return [];
    return [
      {
        slug: meta.slug,
        title: doc.title,
        category: meta.category,
        keywords: meta.keywords.join(' '),
        headings: doc.headings.map((h) => h.text).join(' '),
        body: doc.body,
      },
    ];
  });

const tokenize = (query: string): readonly string[] =>
  query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

const countOccurrences = (haystack: string, token: string): number => {
  if (token.length === 0) return 0;
  let count = 0;
  let from = haystack.indexOf(token);
  // Bounded by string length; advances past each hit.
  while (from !== -1) {
    count += 1;
    from = haystack.indexOf(token, from + token.length);
  }
  return count;
};

const scoreArticle = (
  article: IndexedArticle,
  tokens: readonly string[],
): number => {
  const title = article.title.toLowerCase();
  const keywords = article.keywords.toLowerCase();
  const headings = article.headings.toLowerCase();
  const body = article.body.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    const inTitle = countOccurrences(title, token);
    const inKeywords = countOccurrences(keywords, token);
    const inHeadings = countOccurrences(headings, token);
    const inBody = countOccurrences(body, token);
    if (inTitle + inKeywords + inHeadings + inBody === 0) return 0;
    score += inTitle * 8 + inKeywords * 5 + inHeadings * 3 + inBody;
  }
  return score;
};

const EXCERPT_RADIUS = 60;

const makeExcerpt = (body: string, token: string): string => {
  const at = body.toLowerCase().indexOf(token);
  const flat = body.replace(/\s+/g, ' ').trim();
  if (at === -1) return flat.slice(0, EXCERPT_RADIUS * 2);
  const flatAt = flat.toLowerCase().indexOf(token);
  const start = Math.max(0, flatAt - EXCERPT_RADIUS);
  const end = Math.min(flat.length, flatAt + token.length + EXCERPT_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < flat.length ? '…' : '';
  return `${prefix}${flat.slice(start, end)}${suffix}`;
};

export const searchHelp = (
  query: string,
  locale: string = FALLBACK_LOCALE,
): readonly HelpSearchResult[] => {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const index = buildIndex(locale);
  const results: HelpSearchResult[] = [];
  for (const article of index) {
    const score = scoreArticle(article, tokens);
    if (score <= 0) continue;
    results.push({
      slug: article.slug,
      title: article.title,
      category: article.category,
      excerpt: makeExcerpt(article.body, tokens[0]),
      score,
    });
  }
  return results.sort((a, b) => b.score - a.score);
};
