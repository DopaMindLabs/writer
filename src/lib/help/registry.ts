import type { TourId } from '@/tours/tours';

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
  'accessibility',
  'shortcuts',
  'data',
  'versioning',
  'mobile',
] as const;

export type FeatureArea = (typeof FEATURE_AREAS)[number];

export interface HelpCategory {
  readonly id: string;
  readonly icon: string;
}

export interface HelpArticle {
  readonly slug: string;
  readonly category: HelpCategory['id'];
  readonly featureArea: FeatureArea;
  readonly keywords: readonly string[];
  readonly related?: readonly string[];
  readonly tourId?: TourId;
}

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

export const HELP_ARTICLES: readonly HelpArticle[] = [
  {
    slug: 'getting-started',
    category: 'getting-started',
    featureArea: 'getting-started',
    keywords: ['start', 'intro', 'welcome', 'first', 'tour', 'basics'],
    related: ['features', 'organizing-your-work', 'writing-and-editing'],
    tourId: 'welcome',
  },
  {
    slug: 'features',
    category: 'getting-started',
    featureArea: 'getting-started',
    keywords: [
      'features',
      'all',
      'overview',
      'capabilities',
      'list',
      'what can',
      'everything',
    ],
    related: ['getting-started', 'views-and-modes', 'keyboard-shortcuts'],
  },
  {
    slug: 'whats-new',
    category: 'getting-started',
    featureArea: 'getting-started',
    keywords: ['new', 'changelog', 'release', 'updates', 'latest', 'recent'],
    related: ['getting-started', 'features'],
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
    slug: 'doc-inspector',
    category: 'writing',
    featureArea: 'writing',
    keywords: [
      'inspector',
      'status',
      'lock',
      'word limit',
      'character limit',
      'due date',
      'deadline',
    ],
    related: [
      'writing-and-editing',
      'version-history',
      'customization-and-settings',
    ],
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
    keywords: [
      'brainspace',
      'notes',
      'canvas',
      'connections',
      'ideas',
      'dump',
      'kinds',
      'image',
      'picture',
      'full size',
      'view',
      'image card',
    ],
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
    slug: 'accessibility',
    category: 'customization',
    featureArea: 'accessibility',
    keywords: [
      'accessibility',
      'a11y',
      'wcag',
      'screen reader',
      'contrast',
      'reduce motion',
      'text size',
      'focus',
    ],
    related: ['customization-and-settings', 'keyboard-shortcuts'],
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
    keywords: ['export', 'import', 'backup', 'restore', 'archive', 'local', 'storage', 'offline'],
    related: ['getting-started', 'customization-and-settings'],
  },
  {
    slug: 'version-history',
    category: 'data',
    featureArea: 'versioning',
    keywords: [
      'version',
      'history',
      'revision',
      'restore',
      'rollback',
      'diff',
      'compare',
      'snapshot',
      'pin',
    ],
    related: ['writing-and-editing', 'your-data'],
  },
  {
    slug: 'mobile',
    category: 'mobile',
    featureArea: 'mobile',
    keywords: ['mobile', 'phone', 'tablet', 'touch', 'responsive', 'small screen'],
    related: ['views-and-modes'],
  },
] as const;

export const HELP_SLUGS: readonly string[] = HELP_ARTICLES.map((a) => a.slug);

export const getArticleMeta = (slug: string): HelpArticle | undefined =>
  HELP_ARTICLES.find((a) => a.slug === slug);

export const getCategory = (id: string): HelpCategory | undefined =>
  HELP_CATEGORIES.find((c) => c.id === id);

export const getArticlesByCategory = (
  categoryId: string,
): readonly HelpArticle[] => HELP_ARTICLES.filter((a) => a.category === categoryId);
