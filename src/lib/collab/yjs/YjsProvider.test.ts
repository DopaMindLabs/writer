import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { db } from '@/db/db';
import type { CollabStore, PresenceState, SyncTransport } from '@/lib/collab/types';
import { createDexieCollabStore } from './DexieCollabStore';
import { createYjsProvider } from './YjsProvider';

const LOCAL_A: PresenceState = { authorId: 'a1', name: 'A', hue: 'presence-1', tabId: 't1' };
const LOCAL_B: PresenceState = { authorId: 'b1', name: 'B', hue: 'presence-2', tabId: 't2' };

type Listener = (bytes: Uint8Array) => void;

/** Two SyncTransports wired to each other in-process (A.send → B.onMessage). */
const createTransportPair = (
  sharesStore: boolean,
): [SyncTransport, SyncTransport] => {
  const listenersA = new Set<Listener>();
  const listenersB = new Set<Listener>();
  const make = (own: Set<Listener>, peer: Set<Listener>): SyncTransport => ({
    sharesStore,
    send: (bytes) => {
      peer.forEach((cb) => {
        cb(bytes);
      });
    },
    onMessage: (cb) => {
      own.add(cb);
      return () => {
        own.delete(cb);
      };
    },
    close: () => {
      own.clear();
    },
  });
  return [make(listenersA, listenersB), make(listenersB, listenersA)];
};

/** A store that shares nothing — for isolating the transport sync handshake. */
const emptyStore: CollabStore = {
  append: async () => {
    /* noop */
  },
  loadAll: async () => [],
  compact: async () => {
    /* noop */
  },
  deleteDoc: async () => {
    /* noop */
  },
  trySeed: async () => 'seeded',
  reseedIfEmpty: async () => 'occupied',
};

const text = (ydoc: Y.Doc): string => ydoc.getText('t').toString();

describe('createYjsProvider', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('propagates an edit from one peer to the other', async () => {
    const store = createDexieCollabStore();
    const [ta, tb] = createTransportPair(true);
    const da = new Y.Doc();
    const dbDoc = new Y.Doc();
    const a = createYjsProvider({ docId: 'd1', ydoc: da, store, transports: [ta], local: LOCAL_A });
    const b = createYjsProvider({ docId: 'd1', ydoc: dbDoc, store, transports: [tb], local: LOCAL_B });
    await a.connect();
    await b.connect();

    da.getText('t').insert(0, 'hello');
    expect(text(dbDoc)).toBe('hello');
    a.disconnect();
    b.disconnect();
  });

  it('converges concurrent edits to identical state', async () => {
    const store = createDexieCollabStore();
    const [ta, tb] = createTransportPair(true);
    const da = new Y.Doc();
    const dbDoc = new Y.Doc();
    const a = createYjsProvider({ docId: 'd1', ydoc: da, store, transports: [ta], local: LOCAL_A });
    const b = createYjsProvider({ docId: 'd1', ydoc: dbDoc, store, transports: [tb], local: LOCAL_B });
    await a.connect();
    await b.connect();

    da.getText('t').insert(0, 'AAA');
    dbDoc.getText('t').insert(0, 'BBB');
    expect(text(da)).toBe(text(dbDoc));
    expect(text(da).length).toBe(6);
    a.disconnect();
    b.disconnect();
  });

  it('lets a late joiner converge via the sync handshake', async () => {
    const store = createDexieCollabStore();
    const [ta, tb] = createTransportPair(false);
    const da = new Y.Doc();
    const a = createYjsProvider({ docId: 'd1', ydoc: da, store, transports: [ta], local: LOCAL_A });
    await a.connect();
    da.getText('t').insert(0, 'early');

    // B joins late with a store that shares nothing — it can only converge via
    // the step1/step2 handshake over the transport.
    const dbDoc = new Y.Doc();
    const b = createYjsProvider({
      docId: 'd1',
      ydoc: dbDoc,
      store: emptyStore,
      transports: [tb],
      local: LOCAL_B,
    });
    await b.connect();

    expect(text(dbDoc)).toBe('early');
    a.disconnect();
    b.disconnect();
  });

  it('keeps remote edits out of the local undo history (non-null origins)', async () => {
    const store = createDexieCollabStore();
    const [ta, tb] = createTransportPair(true);
    const da = new Y.Doc();
    const dbDoc = new Y.Doc();
    const a = createYjsProvider({ docId: 'd1', ydoc: da, store, transports: [ta], local: LOCAL_A });
    const b = createYjsProvider({ docId: 'd1', ydoc: dbDoc, store, transports: [tb], local: LOCAL_B });
    await a.connect();
    await b.connect();

    const localOrigin = { local: true };
    const undo = new Y.UndoManager(dbDoc.getText('t'), {
      trackedOrigins: new Set([localOrigin]),
    });

    da.getText('t').insert(0, 'remote ');
    expect(text(dbDoc)).toContain('remote');
    expect(undo.canUndo()).toBe(false); // remote edit was not captured

    dbDoc.transact(() => {
      dbDoc.getText('t').insert(0, 'mine ');
    }, localOrigin);
    expect(undo.canUndo()).toBe(true);

    undo.undo();
    expect(text(dbDoc)).not.toContain('mine');
    expect(text(dbDoc)).toContain('remote'); // the interleaved remote text survives
    a.disconnect();
    b.disconnect();
  });

  it('propagates awareness and clears it on disconnect', async () => {
    const store = createDexieCollabStore();
    const [ta, tb] = createTransportPair(true);
    const da = new Y.Doc();
    const dbDoc = new Y.Doc();
    const a = createYjsProvider({ docId: 'd1', ydoc: da, store, transports: [ta], local: LOCAL_A });
    const b = createYjsProvider({ docId: 'd1', ydoc: dbDoc, store, transports: [tb], local: LOCAL_B });
    await a.connect();
    await b.connect();

    // The Provider's awareness is a y-protocols Awareness at runtime (it accepts
    // partial presence); the @lexical/yjs ProviderAwareness type is stricter.
    (a.awareness as unknown as Awareness).setLocalState({
      name: 'A',
      color: 'var(--presence-1)',
      authorId: 'a1',
      tabId: 't1',
    });
    expect(b.awareness.getStates().has(da.clientID)).toBe(true);

    a.disconnect();
    expect(b.awareness.getStates().has(da.clientID)).toBe(false);
    b.disconnect();
  });

  it('does not double-persist updates from a shared-store peer', async () => {
    const store = createDexieCollabStore();
    const [ta, tb] = createTransportPair(true);
    const da = new Y.Doc();
    const dbDoc = new Y.Doc();
    const a = createYjsProvider({ docId: 'd1', ydoc: da, store, transports: [ta], local: LOCAL_A });
    const b = createYjsProvider({ docId: 'd1', ydoc: dbDoc, store, transports: [tb], local: LOCAL_B });
    await a.connect();
    await b.connect();

    da.getText('t').insert(0, 'x'); // one edit on A
    dbDoc.getText('t').insert(0, 'y'); // one edit on B

    // Exactly one append per edit — the shared-store peer never re-persists.
    expect(await db.docUpdates.where('docId').equals('d1').count()).toBe(2);
    a.disconnect();
    b.disconnect();
  });
});
