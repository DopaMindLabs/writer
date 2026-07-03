import * as Y from 'yjs';
import type { Provider } from '@lexical/yjs';
import type { Profile } from '@/lib/account/profile';
import type { CollabStore, PresenceState } from '@/lib/collab/types';
import { createBroadcastChannelTransport } from '@/lib/collab/transport/BroadcastChannelTransport';
import { createYjsProvider } from './YjsProvider';

const toPresence = (profile: Profile, tabId: string): PresenceState => ({
  authorId: profile.authorId,
  name: profile.displayName,
  hue: profile.presenceHue,
  tabId,
});

/**
 * Build the `providerFactory` the Lexical CollaborationPlugin calls per
 * document: one Yjs provider over a same-browser BroadcastChannel transport,
 * backed by the shared collab store and this device's identity.
 */
export const makeProviderFactory =
  (store: CollabStore, profile: Profile, tabId: string) =>
  (id: string, yjsDocMap: Map<string, Y.Doc>): Provider => {
    let ydoc = yjsDocMap.get(id);
    if (!ydoc) {
      ydoc = new Y.Doc();
      yjsDocMap.set(id, ydoc);
    }
    return createYjsProvider({
      docId: id,
      ydoc,
      store,
      transports: [createBroadcastChannelTransport(id)],
      local: toPresence(profile, tabId),
    });
  };
