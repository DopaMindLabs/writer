import type { SyncTransport } from '@/lib/collab/types';

/**
 * A {@link SyncTransport} over a `BroadcastChannel` — the same-browser transport
 * for tabs editing one document. Its peers are other tabs of this browser, which
 * persist to the *same* local store, so {@link SyncTransport.sharesStore} is
 * `true` and the provider must not re-persist their updates.
 */
export const createBroadcastChannelTransport = (docId: string): SyncTransport => {
  const channel = new BroadcastChannel(`lipsum-doc-${docId}`);
  const listeners = new Set<(bytes: Uint8Array) => void>();
  // A Yjs update can flush a moment after the provider closes the transport
  // (editor unmount races an in-flight local edit or awareness tick). Posting to
  // a closed BroadcastChannel throws `InvalidStateError`, which would otherwise
  // reach the error boundary and blank the whole surface — so drop late sends.
  let closed = false;

  channel.onmessage = (event: MessageEvent) => {
    const data = event.data as ArrayBuffer | Uint8Array;
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    listeners.forEach((cb) => {
      cb(bytes);
    });
  };

  return {
    sharesStore: true,
    send: (bytes) => {
      if (closed) return;
      channel.postMessage(bytes);
    },
    onMessage: (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    close: () => {
      closed = true;
      channel.close();
    },
  };
};
