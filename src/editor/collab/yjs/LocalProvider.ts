import type { Provider, ProviderAwareness, UserState } from '@lexical/yjs';
import type { Doc } from 'yjs';

/**
 * Minimal local-only `Provider` for `CollaborationPlugin`. There is no network
 * yet — this just satisfies the plugin's interface so the binding can connect
 * a Y.Doc to the Lexical editor. When a real provider is added later, it
 * slots in here without touching the rest of the binding.
 */

type SyncListener = (isSynced: boolean) => void;

const noopAwareness = (): ProviderAwareness => ({
  getLocalState: () => null,
  getStates: () => new Map<number, UserState>(),
  setLocalState: () => undefined,
  setLocalStateField: () => undefined,
  on: () => undefined,
  off: () => undefined,
});

export const createLocalProvider = (doc: Doc): Provider => {
  // doc reserved so a future networked provider can bind to it here.
  void doc;
  const syncListeners = new Set<SyncListener>();
  const provider: Provider = {
    awareness: noopAwareness(),
    connect: () => {
      queueMicrotask(() => {
        for (const cb of syncListeners) cb(true);
      });
    },
    disconnect: () => undefined,
    on: (type, cb) => {
      if (type === 'sync') syncListeners.add(cb as SyncListener);
    },
    off: (type, cb) => {
      if (type === 'sync') syncListeners.delete(cb as SyncListener);
    },
  };
  return provider;
};
