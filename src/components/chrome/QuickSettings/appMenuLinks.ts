import { EXTERNAL_LINKS, routes } from '@/lib/routes';
import { invariant } from '@/lib/invariant';

export type AppMenuSurface = 'popover' | 'sheet';

/**
 * One app-level destination shared by the desktop Quick Settings popover and
 * the mobile More sheet. Existence, targets and ordering live here so the two
 * surfaces cannot drift — a link added for one is offered to both. The label
 * *voice* differs per surface (the popover footer says "help centre →", the
 * sheet says "Help & shortcuts"), so each surface keeps its own i18n key.
 */
export interface AppMenuLink {
  id: string;
  href: string;
  /** Opens in a new tab (an off-app destination). */
  external?: boolean;
  surfaces: readonly AppMenuSurface[];
  /** chrome-namespace key for the popover voice. */
  popoverLabelKey?: string;
  popoverTestId?: string;
  /** chrome-namespace key for the sheet voice. */
  sheetLabelKey?: string;
}

/**
 * Declared in the sheet's App-group order; the popover picks entries by id, so
 * this order is the single source for the sheet and does not bind the popover.
 */
export const APP_MENU_LINKS: readonly AppMenuLink[] = [
  {
    id: 'universal-settings',
    href: routes.settings(),
    surfaces: ['popover', 'sheet'],
    popoverLabelKey: 'quickSettings.fullSettings',
    popoverTestId: 'quick-settings-full-settings',
    sheetLabelKey: 'mobileMore.settings',
  },
  {
    id: 'about',
    href: routes.about(),
    surfaces: ['popover', 'sheet'],
    popoverLabelKey: 'quickSettings.about',
    popoverTestId: 'quick-settings-about',
    sheetLabelKey: 'mobileMore.about',
  },
  {
    id: 'help',
    href: routes.help(),
    surfaces: ['popover', 'sheet'],
    popoverLabelKey: 'quickSettings.helpLink',
    popoverTestId: 'quick-settings-help',
    sheetLabelKey: 'mobileMore.help',
  },
  {
    id: 'whats-new',
    href: routes.helpArticle('whats-new'),
    surfaces: ['popover', 'sheet'],
    popoverLabelKey: 'quickSettings.whatsNew',
    popoverTestId: 'quick-settings-whats-new',
    sheetLabelKey: 'mobileMore.whatsNew',
  },
  {
    id: 'accessibility',
    href: routes.settings('accessibility'),
    surfaces: ['popover', 'sheet'],
    popoverLabelKey: 'quickSettings.accessibility',
    popoverTestId: 'quick-settings-accessibility',
    sheetLabelKey: 'mobileMore.accessibility',
  },
  {
    id: 'profile',
    href: routes.settings('profile'),
    surfaces: ['popover', 'sheet'],
    popoverLabelKey: 'quickSettings.profile',
    popoverTestId: 'quick-settings-profile',
    sheetLabelKey: 'mobileMore.profile',
  },
  {
    id: 'contact',
    href: EXTERNAL_LINKS.githubNewIssue,
    external: true,
    surfaces: ['sheet'],
    sheetLabelKey: 'mobileMore.contact',
  },
];

/** The links a given surface renders, in declaration order. */
export const appMenuLinksFor = (surface: AppMenuSurface): AppMenuLink[] =>
  APP_MENU_LINKS.filter((link) => link.surfaces.includes(surface));

/** Look a link up by id; throws if the id is unknown (caller typo guard). */
export const appMenuLink = (id: string): AppMenuLink => {
  const link = APP_MENU_LINKS.find((entry) => entry.id === id);
  invariant(link, `Unknown app menu link: ${id}`);
  return link;
};

export interface PopoverAppMenuLink {
  href: string;
  labelKey: string;
  testId: string;
}

/** Resolve a link for the popover surface, asserting it is configured for it. */
export const popoverAppMenuLink = (id: string): PopoverAppMenuLink => {
  const link = appMenuLink(id);
  invariant(
    link.popoverLabelKey && link.popoverTestId,
    `App menu link ${id} is not configured for the popover`,
  );
  return {
    href: link.href,
    labelKey: link.popoverLabelKey,
    testId: link.popoverTestId,
  };
};

export interface SheetAppMenuLink {
  id: string;
  href: string;
  external: boolean;
  labelKey: string;
}

/** Resolve the sheet's App-group links, asserting each has a sheet label. */
export const sheetAppMenuLinks = (): SheetAppMenuLink[] =>
  appMenuLinksFor('sheet').map((link) => {
    invariant(
      link.sheetLabelKey,
      `App menu link ${link.id} is not configured for the sheet`,
    );
    return {
      id: link.id,
      href: link.href,
      external: link.external ?? false,
      labelKey: link.sheetLabelKey,
    };
  });
