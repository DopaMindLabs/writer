import { useMemo } from 'react';
import type { Profile } from '@/lib/profile/profile';
import { useProfile } from '@/lib/profile/useProfile';
import { getTabId } from '@/lib/tabId';
import { collabStore } from '@/lib/collab/collabStore';
import {
  makeProviderFactory,
  type ProviderFactory,
} from '@/lib/collab/yjs/providerFactory';

/**
 * Everything the collaborative editor needs to mount: the per-document provider
 * factory plus the local cursor label and colour the CollaborationPlugin paints.
 */
export interface CollabConfig {
  providerFactory: ProviderFactory;
  username: string;
  cursorColor: string;
}

/**
 * Builds the collaboration config from the shared store and this device's
 * identity. Recomputes only when a profile field actually changes, so the
 * provider factory stays stable across ordinary re-renders (a fresh factory
 * would otherwise remount the whole collaboration). Returns `undefined` until
 * the profile row exists.
 */
export const useCollab = (): CollabConfig | undefined => {
  const profile = useProfile();
  const authorId = profile?.authorId;
  const displayName = profile?.displayName ?? '';
  const presenceHue = profile?.presenceHue;

  return useMemo(() => {
    if (!authorId || !presenceHue) return undefined;
    const identity: Profile = { authorId, displayName, presenceHue };
    return {
      providerFactory: makeProviderFactory(collabStore, identity, getTabId()),
      username: displayName,
      cursorColor: `var(--${presenceHue})`,
    };
  }, [authorId, displayName, presenceHue]);
};
