/**
 * Platform detection for *displaying* keyboard shortcuts. The handler side uses
 * `event.metaKey || event.ctrlKey` (see `useGlobalShortcuts`); this is the
 * display companion so a hint shows the key the running platform actually uses
 * — ⌘ on macOS, Ctrl elsewhere — instead of a hard-coded glyph.
 */

export interface PlatformNavigator {
  userAgentData?: { platform?: string };
  platform?: string;
}

const APPLE_RE = /mac|iphone|ipad|ipod/i;

const resolveNavigator = (
  nav?: PlatformNavigator,
): PlatformNavigator | undefined => {
  if (nav) return nav;
  if (typeof navigator !== 'undefined') return navigator;
  return undefined;
};

/** Whether the platform uses the Command key. `nav` is injectable for tests. */
export const isApplePlatform = (nav?: PlatformNavigator): boolean => {
  const source = resolveNavigator(nav);
  const platform = source?.userAgentData?.platform ?? source?.platform ?? '';
  return APPLE_RE.test(platform);
};

/** The primary modifier label for the running platform. */
export const getModifierLabel = (nav?: PlatformNavigator): '⌘' | 'Ctrl' =>
  isApplePlatform(nav) ? '⌘' : 'Ctrl';
