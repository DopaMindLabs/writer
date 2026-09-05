import { newId } from '@/lib/ids';

const TAB_ID_KEY = 'lipsum-tab-id';

/**
 * A per-tab identifier held in sessionStorage: each browsing context gets its
 * own, and it survives reloads within that tab.
 */
export const getTabId = (): string => {
  const existing = sessionStorage.getItem(TAB_ID_KEY);
  if (existing) return existing;
  const fresh = newId();
  sessionStorage.setItem(TAB_ID_KEY, fresh);
  return fresh;
};
