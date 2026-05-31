export enum RouteName {
  Home = 'home',
  About = 'about',
  Settings = 'settings',
  Templates = 'templates',
  SpaceWrite = 'spaceWrite',
  SpaceSettings = 'spaceSettings',
  DocWrite = 'docWrite',
  DocFocus = 'docFocus',
  DocRead = 'docRead',
  DocSplit = 'docSplit',
  BrainSpace = 'brainSpace',
  Citations = 'citations',
  Help = 'help',
  HelpArticle = 'helpArticle',
}

export const ROUTE_PATHS: Record<RouteName, string> = {
  [RouteName.Home]: '/',
  [RouteName.About]: '/about',
  [RouteName.Settings]: '/settings',
  [RouteName.Templates]: '/new',
  [RouteName.SpaceWrite]: '/s/:spaceId',
  [RouteName.SpaceSettings]: '/s/:spaceId/settings',
  [RouteName.DocWrite]: '/s/:spaceId/d/:docId',
  [RouteName.DocFocus]: '/s/:spaceId/d/:docId/focus',
  [RouteName.DocRead]: '/s/:spaceId/d/:docId/read',
  [RouteName.DocSplit]: '/s/:spaceId/d/:docId/split',
  [RouteName.BrainSpace]: '/s/:spaceId/dump',
  [RouteName.Citations]: '/s/:spaceId/citations',
  [RouteName.Help]: '/help',
  [RouteName.HelpArticle]: '/help/:slug',
};

export const routes = {
  home: () => '/',
  about: () => '/about',
  settings: (tab?: string) => (tab ? `/settings?tab=${tab}` : '/settings'),
  templates: () => '/new',
  spaceWrite: (spaceId: string) => `/s/${spaceId}`,
  spaceSettings: (spaceId: string) => `/s/${spaceId}/settings`,
  docWrite: (spaceId: string, docId: string) => `/s/${spaceId}/d/${docId}`,
  docFocus: (spaceId: string, docId: string) =>
    `/s/${spaceId}/d/${docId}/focus`,
  docRead: (spaceId: string, docId: string) => `/s/${spaceId}/d/${docId}/read`,
  docSplit: (spaceId: string, docId: string) =>
    `/s/${spaceId}/d/${docId}/split`,
  brainSpace: (spaceId: string) => `/s/${spaceId}/dump`,
  citations: (spaceId: string) => `/s/${spaceId}/citations`,
  help: () => '/help',
  helpArticle: (slug: string, anchor?: string) =>
    `/help/${slug}${anchor ? `#${anchor}` : ''}`,
} as const;

export interface InternalNavItem {
  name: RouteName;
  to: string;
  i18nKey: string;
  end?: boolean;
  external?: false;
}

export interface ExternalNavItem {
  to: string;
  i18nKey: string;
  external: true;
}

export type NavItem = InternalNavItem | ExternalNavItem;

export const EXTERNAL_LINKS = {
  github: 'https://github.com/DopaMindLabs/Writer',
  githubSource: 'https://github.com/DopaMindLabs/writer/',
  license: 'https://github.com/DopaMindLabs/Writer?tab=License-1-ov-file',
} as const;

export const PRIMARY_NAV: readonly NavItem[] = [
  { name: RouteName.Home, to: routes.home(), i18nKey: 'home', end: true },
  { name: RouteName.About, to: routes.about(), i18nKey: 'about' },
  { name: RouteName.Help, to: routes.help(), i18nKey: 'help' },
  { name: RouteName.Settings, to: routes.settings(), i18nKey: 'settings' },
  { to: EXTERNAL_LINKS.github, i18nKey: 'github', external: true },
];
