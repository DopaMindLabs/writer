import type { TourId } from '@/tours/tours';

/**
 * Language-independent structure of the Help Center. Article *titles* live in
 * the markdown files themselves (`src/help/content/<locale>/<slug>.md`); this
 * registry only describes how articles are grouped, searched, and kept in sync
 * with the features they document.
 */

/** Stable identifiers for every user-facing feature area the help must cover. */
export const FEATURE_AREAS = [
  'getting-started',
  'writing',
  'formatting',
  'organizing',
  'views-modes',
  'citations',
  'brainspace',
  'annotations',
  'customization',
  'shortcuts',
  'data',
  'mobile',
] as const;

export type FeatureArea = (typeof FEATURE_AREAS)[number];

export interface HelpCategory {
  /** Stable id, also used as the i18n sub-key under `help:categories`. */
  readonly id: string;
  /** Lucide icon name resolved to a component in `HelpNav`. */
  readonly icon: string;
}

export interface HelpArticle {
  readonly slug: string;
  readonly category: HelpCategory['id'];
  readonly featureArea: FeatureArea;
  readonly keywords: readonly string[];
  readonly related?: readonly string[];
  /** Links the article to a guided tour so coverage stays enforced. */
  readonly tourId?: TourId;
}

/** Ordered top-level groups shown in the Help nav and landing page. */
export const HELP_CATEGORIES: readonly HelpCategory[] = [
  { id: 'getting-started', icon: 'Sparkles' },
  { id: 'writing', icon: 'Pencil' },
  { id: 'organizing', icon: 'List' },
  { id: 'views', icon: 'Columns2' },
  { id: 'research', icon: 'Quote' },
  { id: 'brainspace', icon: 'Brain' },
  { id: 'annotations', icon: 'Highlighter' },
  { id: 'customization', icon: 'Settings' },
  { id: 'data', icon: 'Database' },
  { id: 'mobile', icon: 'Smartphone' },
] as const;

/** Ordered articles. Order within a category is the order shown in the nav. */
export const HELP_ARTICLES: readonly HelpArticle[] = [
  {
    slug: 'getting-started',
    category: 'getting-started',
    featureArea: 'getting-started',
    keywords: ['start', 'intro', 'welcome', 'first', 'tour', 'basics'],
    related: ['organizing-your-work', 'writing-and-editing'],
    tourId: 'welcome',
  },
  {
    slug: 'writing-and-editing',
    category: 'writing',
    featureArea: 'writing',
    keywords: ['write', 'editor', 'text', 'draft', 'typing', 'autosave'],
    related: ['formatting-and-markdown', 'views-and-modes'],
    tourId: 'writer',
  },
  {
    slug: 'formatting-and-markdown',
    category: 'writing',
    featureArea: 'formatting',
    keywords: ['markdown', 'bold', 'italic', 'heading', 'list', 'shortcut'],
    related: ['writing-and-editing', 'keyboard-shortcuts'],
  },
  {
    slug: 'organizing-your-work',
    category: 'organizing',
    featureArea: 'organizing',
    keywords: ['space', 'section', 'document', 'template', 'folder', 'organize'],
    related: ['getting-started', 'views-and-modes'],
  },
  {
    slug: 'views-and-modes',
    category: 'views',
    featureArea: 'views-modes',
    keywords: ['write', 'focus', 'read', 'split', 'inspector', 'reading width'],
    related: ['writing-and-editing', 'keyboard-shortcuts'],
  },
  {
    slug: 'citations-and-bibliography',
    category: 'research',
    featureArea: 'citations',
    keywords: ['citation', 'bibtex', 'reference', 'bibliography', 'import', 'export'],
    related: ['brainspace'],
    tourId: 'citations',
  },
  {
    slug: 'brainspace',
    category: 'brainspace',
    featureArea: 'brainspace',
    keywords: ['notes', 'canvas', 'connections', 'ideas', 'dump', 'kinds'],
    related: ['citations-and-bibliography', 'annotations-and-highlights'],
    tourId: 'brainspace',
  },
  {
    slug: 'annotations-and-highlights',
    category: 'annotations',
    featureArea: 'annotations',
    keywords: ['highlight', 'annotation', 'palette', 'mark', 'color', 'note'],
    related: ['brainspace', 'customization-and-settings'],
  },
  {
    slug: 'customization-and-settings',
    category: 'customization',
    featureArea: 'customization',
    keywords: ['theme', 'dark', 'typography', 'settings', 'preferences', 'editor'],
    related: ['keyboard-shortcuts', 'your-data'],
  },
  {
    slug: 'keyboard-shortcuts',
    category: 'customization',
    featureArea: 'shortcuts',
    keywords: ['keyboard', 'shortcut', 'hotkey', 'command', 'cmd', 'ctrl'],
    related: ['views-and-modes', 'formatting-and-markdown'],
  },
  {
    slug: 'your-data',
    category: 'data',
    featureArea: 'data',
    keywords: ['export', 'import', 'backup', 'local', 'storage', 'offline'],
    related: ['getting-started', 'customization-and-settings'],
  },
  {
    slug: 'mobile',
    category: 'mobile',
    featureArea: 'mobile',
    keywords: ['mobile', 'phone', 'tablet', 'touch', 'responsive', 'small screen'],
    related: ['views-and-modes'],
  },
] as const;

/** All known article slugs, for validation at trust boundaries (URL params). */
export const HELP_SLUGS: readonly string[] = HELP_ARTICLES.map((a) => a.slug);

export const getArticleMeta = (slug: string): HelpArticle | undefined =>
  HELP_ARTICLES.find((a) => a.slug === slug);

export const getCategory = (id: string): HelpCategory | undefined =>
  HELP_CATEGORIES.find((c) => c.id === id);

export const getArticlesByCategory = (
  categoryId: string,
): readonly HelpArticle[] => HELP_ARTICLES.filter((a) => a.category === categoryId);
