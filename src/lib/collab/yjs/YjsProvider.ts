import * as Y from 'yjs';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import type { Provider } from '@lexical/yjs';
import type {
  CollabStore,
  PresenceState,
  SyncTransport,
} from '@/lib/collab/types';
import { createProviderEmitter, type ProviderEmitter } from './providerEmitter';

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const SYNC_ALONE_TIMEOUT_MS = 300;

interface AwarenessChange {
  added: number[];
  updated: number[];
  removed: number[];
}

interface ProviderRuntime {
  readonly docId: string;
  readonly ydoc: Y.Doc;
  readonly store: CollabStore;
  readonly transports: readonly SyncTransport[];
  readonly awareness: Awareness;
  readonly emitter: ProviderEmitter;
  readonly markSynced: () => void;
}

export interface YjsProviderConfig {
  readonly docId: string;
  readonly ydoc: Y.Doc;
  readonly store: CollabStore;
  readonly transports: readonly SyncTransport[];
  readonly local: PresenceState;
}

const broadcast = (
  transports: readonly SyncTransport[],
  bytes: Uint8Array,
): void => {
  transports.forEach((transport) => {
    transport.send(bytes);
  });
};

/**
 * The opening sync message: our state vector, asking the peer to reply with the
 * updates we are missing (the y-protocols sync handshake opener).
 */
const encodeSyncRequest = (ydoc: Y.Doc): Uint8Array => {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, MSG_SYNC);
  syncProtocol.writeSyncStep1(enc, ydoc);
  return encoding.toUint8Array(enc);
};

const encodeSyncUpdate = (update: Uint8Array): Uint8Array => {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, MSG_SYNC);
  syncProtocol.writeUpdate(enc, update);
  return encoding.toUint8Array(enc);
};

const encodeAwareness = (awareness: Awareness, changed: number[]): Uint8Array => {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, MSG_AWARENESS);
  encoding.writeVarUint8Array(enc, encodeAwarenessUpdate(awareness, changed));
  return encoding.toUint8Array(enc);
};

/**
 * Local edit (or transport-origin edit): persist it — unless a `sharesStore`
 * peer already wrote it to this browser's store — and relay to every transport
 * except the one it came from. Replay of our own store state (origin === store)
 * is never echoed.
 */
const persistAndRelayUpdate = (
  runtime: ProviderRuntime,
  update: Uint8Array,
  origin: unknown,
): void => {
  if (origin === runtime.store) return;
  const fromSharedStorePeer = runtime.transports.some(
    (transport) => origin === transport && transport.sharesStore,
  );
  if (!fromSharedStorePeer) {
    // The store tracks this write so a restore can await it via `whenPersisted`;
    // surface a failure here rather than dropping the promise silently, so a
    // persistence error is at least visible even outside a restore.
    void runtime.store.append(runtime.docId, update).catch((error: unknown) => {
      console.error('collab store append failed', error);
    });
  }
  const message = encodeSyncUpdate(update);
  runtime.transports.forEach((transport) => {
    if (origin !== transport) transport.send(message);
  });
};

/** Inbound message from `transport`, used as the (non-null) transaction origin. */
const handleInbound = (
  runtime: ProviderRuntime,
  transport: SyncTransport,
  bytes: Uint8Array,
): void => {
  const decoder = decoding.createDecoder(bytes);
  const type = decoding.readVarUint(decoder);
  if (type === MSG_SYNC) {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_SYNC);
    syncProtocol.readSyncMessage(decoder, enc, runtime.ydoc, transport);
    if (encoding.length(enc) > 1) transport.send(encoding.toUint8Array(enc));
    runtime.markSynced();
  } else if (type === MSG_AWARENESS) {
    applyAwarenessUpdate(
      runtime.awareness,
      decoding.readVarUint8Array(decoder),
      transport,
    );
  }
};

const connectProvider = async (
  runtime: ProviderRuntime,
  local: PresenceState,
): Promise<void> => {
  const updates = await runtime.store.loadAll(runtime.docId);
  if (updates.length > 0) {
    Y.applyUpdate(runtime.ydoc, Y.mergeUpdates(updates), runtime.store);
  }
  runtime.transports.forEach((transport) => {
    transport.onMessage((bytes) => {
      handleInbound(runtime, transport, bytes);
    });
  });
  broadcast(runtime.transports, encodeSyncRequest(runtime.ydoc));
  runtime.awareness.setLocalState({
    name: local.name,
    color: `var(--${local.hue})`,
    authorId: local.authorId,
    tabId: local.tabId,
  });
  setTimeout(runtime.markSynced, SYNC_ALONE_TIMEOUT_MS);
  void runtime.store.compact(runtime.docId);
};

const disconnectProvider = (runtime: ProviderRuntime): void => {
  removeAwarenessStates(runtime.awareness, [runtime.ydoc.clientID], 'disconnect');
  runtime.transports.forEach((transport) => {
    transport.close();
  });
  runtime.emitter.emit('status', { status: 'disconnected' });
};

/**
 * A `@lexical/yjs` Provider implementing the sync + awareness protocol over one
 * or more {@link SyncTransport}s, persisting to a {@link CollabStore}.
 *
 * Origins are never null: replayed store state uses `store`, inbound transport
 * messages use the transport instance — so the local UndoManager never captures
 * remote edits. `sharesStore` peers are relayed but not re-persisted.
 */
export const createYjsProvider = (config: YjsProviderConfig): Provider => {
  const { docId, ydoc, store, transports, local } = config;
  const awareness = new Awareness(ydoc);
  const emitter = createProviderEmitter();
  let synced = false;
  const markSynced = (): void => {
    if (synced) return;
    synced = true;
    emitter.emit('sync', true);
  };
  const runtime: ProviderRuntime = {
    docId,
    ydoc,
    store,
    transports,
    awareness,
    emitter,
    markSynced,
  };

  ydoc.on('update', (update: Uint8Array, origin: unknown) => {
    persistAndRelayUpdate(runtime, update, origin);
  });
  awareness.on('update', (change: AwarenessChange) => {
    broadcast(transports, encodeAwareness(awareness, [
      ...change.added,
      ...change.updated,
      ...change.removed,
    ]));
  });

  return {
    awareness,
    connect: () => connectProvider(runtime, local),
    disconnect: () => {
      disconnectProvider(runtime);
    },
    on: emitter.on,
    off: emitter.off,
  } as unknown as Provider;
};
