import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import type { CollabStore, PresenceState } from '@/lib/collab/types';
import { generateMemberKeys, memberPublicOf, type MemberKeys } from '@/lib/collab/crypto/memberKeys';
import { generateContentKey } from '@/lib/collab/crypto/contentKey';
import { sealFrame, type FrameType, type RelayEnvelope, type Role } from '@/lib/collab/crypto/envelope';
import { utf8 } from '@/lib/collab/crypto/bytes';
import type { Roster, RosterMember } from '@/lib/collab/roster';
import { createYjsProvider } from '@/lib/collab/yjs/YjsProvider';
import { createBroadcastChannelTransport } from '@/lib/collab/transport/BroadcastChannelTransport';
import { createEncryptedRelayTransport, type RelayDeps } from './EncryptedRelayTransport';
import { encodeEnvelope } from './frameCodec';
import type { BlobType, ServerMessage, SocketFactory, StoredBlob } from './relayClient';

const ROOM = 'room';
const LOCAL_A: PresenceState = { authorId: 'A', name: 'A', hue: 'presence-1', tabId: 't1' };
const LOCAL_B: PresenceState = { authorId: 'B', name: 'B', hue: 'presence-2', tabId: 't2' };

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 80));
const text = (doc: Y.Doc): string => doc.getText('t').toString();

const emptyStore: CollabStore = {
  append: async () => {},
  loadAll: async () => [],
  compact: async () => {},
  deleteDoc: async () => {},
  trySeed: async () => 'seeded',
};

// An in-memory blind relay mirroring the reference server's semantics: per-room
// append log with monotonic seq, resume, fan-out excluding the sender, awareness
// forwarded-not-stored. Enough to drive the transport end-to-end in a unit test.
interface Room {
  seq: number;
  log: StoredBlob[];
  subs: Set<(message: ServerMessage) => void>;
}

const fanout = (
  subs: Set<(message: ServerMessage) => void>,
  exclude: (message: ServerMessage) => void,
  message: ServerMessage,
): void => {
  for (const sub of subs) {
    if (sub !== exclude) sub(message);
  }
};

const createHub = (): { factory: SocketFactory } => {
  const rooms = new Map<string, Room>();
  const roomOf = (id: string): Room => {
    const existing = rooms.get(id);
    if (existing) return existing;
    const room: Room = { seq: 0, log: [], subs: new Set() };
    rooms.set(id, room);
    return room;
  };
  const factory: SocketFactory = () => {
    const listeners = new Set<(message: ServerMessage) => void>();
    const self = (message: ServerMessage): void => {
      for (const cb of listeners) cb(message);
    };
    let joined: string | null = null;
    return {
      send: (message) => {
        if (message.t === 'connect') {
          joined = message.roomId;
          const room = roomOf(joined);
          room.subs.add(self);
          const since = message.resumeFrom ?? 0;
          for (const blob of room.log) {
            if (blob.seq > since) self({ t: 'blob', blob });
          }
          return;
        }
        if (joined === null) return;
        const room = roomOf(joined);
        if (message.t === 'post' && message.blob.type === 'awareness') {
          fanout(room.subs, self, { t: 'awareness', payload: message.blob.payload });
          return;
        }
        if (message.t === 'post') {
          room.seq += 1;
          const blob: StoredBlob = { seq: room.seq, type: message.blob.type, payload: message.blob.payload };
          room.log.push(blob);
          fanout(room.subs, self, { t: 'blob', blob });
          return;
        }
        if (message.t === 'supersede') {
          room.log = room.log.filter((blob) => blob.seq > message.upto);
          return;
        }
        rooms.delete(joined);
      },
      onMessage: (cb) => {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
      onStatus: (cb) => {
        cb('online');
        return () => {};
      },
      close: () => {
        if (joined !== null) roomOf(joined).subs.delete(self);
      },
    };
  };
  return { factory };
};

const rosterMember = async (keys: MemberKeys, name: string, role: Role): Promise<RosterMember> => ({
  ...(await memberPublicOf(keys, name)),
  role,
  addedAt: 1,
});

interface Room3 {
  owner: MemberKeys;
  writer: MemberKeys;
  reader: MemberKeys;
  roster: Roster;
  contentKey: CryptoKey;
}

const buildRoom = async (): Promise<Room3> => {
  const owner = await generateMemberKeys('A');
  const writer = await generateMemberKeys('B');
  const reader = await generateMemberKeys('R');
  const roster: Roster = {
    roomId: ROOM,
    version: 1,
    contentEpoch: 1,
    members: [
      await rosterMember(owner, 'A', 'owner'),
      await rosterMember(writer, 'B', 'writer'),
      await rosterMember(reader, 'R', 'reader'),
    ],
    signedBy: 'A',
    sig: new Uint8Array(),
  };
  const contentKey = await generateContentKey();
  return { owner, writer, reader, roster, contentKey };
};

const depsFor = (
  keys: MemberKeys,
  factory: SocketFactory,
  roster: Roster,
  contentKey: CryptoKey,
  resumeFrom?: () => number,
): RelayDeps => ({
  socketFactory: factory,
  roster: () => roster,
  keys: () => keys,
  contentKey: () => contentKey,
  resumeFrom,
});

const sealAs = (
  keys: MemberKeys,
  type: FrameType,
  payload: string,
  contentKey: CryptoKey,
): Promise<RelayEnvelope> =>
  sealFrame(contentKey, keys, { roomId: ROOM, type, epoch: 1 }, utf8(payload));

const inject = (factory: SocketFactory, env: RelayEnvelope, type: BlobType): void => {
  const socket = factory('ws://relay');
  socket.send({ t: 'connect', roomId: ROOM });
  socket.send({ t: 'post', blob: { type, payload: encodeEnvelope(env) } });
};

describe('createEncryptedRelayTransport', () => {
  it('converges two peers over the relay (type in A appears in B)', async () => {
    const { owner, writer, roster, contentKey } = await buildRoom();
    const { factory } = createHub();
    const ta = createEncryptedRelayTransport(ROOM, 'ws://relay', depsFor(owner, factory, roster, contentKey));
    const tb = createEncryptedRelayTransport(ROOM, 'ws://relay', depsFor(writer, factory, roster, contentKey));
    ta.connect();
    tb.connect();
    const da = new Y.Doc();
    const dbDoc = new Y.Doc();
    const a = createYjsProvider({ docId: 'doc', ydoc: da, store: emptyStore, transports: [ta], local: LOCAL_A });
    const b = createYjsProvider({ docId: 'doc', ydoc: dbDoc, store: emptyStore, transports: [tb], local: LOCAL_B });
    await a.connect();
    await b.connect();
    await settle();

    da.getText('t').insert(0, 'hello');
    await settle();
    expect(text(dbDoc)).toBe('hello');
    a.disconnect();
    b.disconnect();
  });

  it('converges concurrent edits both ways', async () => {
    const { owner, writer, roster, contentKey } = await buildRoom();
    const { factory } = createHub();
    const ta = createEncryptedRelayTransport(ROOM, 'ws://relay', depsFor(owner, factory, roster, contentKey));
    const tb = createEncryptedRelayTransport(ROOM, 'ws://relay', depsFor(writer, factory, roster, contentKey));
    ta.connect();
    tb.connect();
    const da = new Y.Doc();
    const dbDoc = new Y.Doc();
    const a = createYjsProvider({ docId: 'doc', ydoc: da, store: emptyStore, transports: [ta], local: LOCAL_A });
    const b = createYjsProvider({ docId: 'doc', ydoc: dbDoc, store: emptyStore, transports: [tb], local: LOCAL_B });
    await a.connect();
    await b.connect();
    await settle();

    da.getText('t').insert(0, 'AAA');
    dbDoc.getText('t').insert(0, 'BBB');
    await settle();
    expect(text(da)).toBe(text(dbDoc));
    expect(text(da).length).toBe(6);
    a.disconnect();
    b.disconnect();
  });

  it('keeps remote edits out of the local undo history (non-null origin)', async () => {
    const { owner, writer, roster, contentKey } = await buildRoom();
    const { factory } = createHub();
    const ta = createEncryptedRelayTransport(ROOM, 'ws://relay', depsFor(owner, factory, roster, contentKey));
    const tb = createEncryptedRelayTransport(ROOM, 'ws://relay', depsFor(writer, factory, roster, contentKey));
    ta.connect();
    tb.connect();
    const da = new Y.Doc();
    const dbDoc = new Y.Doc();
    const a = createYjsProvider({ docId: 'doc', ydoc: da, store: emptyStore, transports: [ta], local: LOCAL_A });
    const b = createYjsProvider({ docId: 'doc', ydoc: dbDoc, store: emptyStore, transports: [tb], local: LOCAL_B });
    await a.connect();
    await b.connect();
    await settle();

    const localOrigin = { local: true };
    const undo = new Y.UndoManager(dbDoc.getText('t'), { trackedOrigins: new Set([localOrigin]) });
    da.getText('t').insert(0, 'remote ');
    await settle();
    expect(text(dbDoc)).toContain('remote');
    expect(undo.canUndo()).toBe(false);

    dbDoc.transact(() => {
      dbDoc.getText('t').insert(0, 'mine ');
    }, localOrigin);
    expect(undo.canUndo()).toBe(true);
    a.disconnect();
    b.disconnect();
  });

  it('drops a frame signed by a non-roster key', async () => {
    const { owner, roster, contentKey } = await buildRoom();
    const stranger = await generateMemberKeys('S');
    const { factory } = createHub();
    const victim = createEncryptedRelayTransport(ROOM, 'ws://relay', depsFor(owner, factory, roster, contentKey));
    const seen: Uint8Array[] = [];
    victim.onMessage((bytes) => seen.push(bytes));
    victim.connect();

    inject(factory, await sealAs(stranger, 'update', 'forged', contentKey), 'update');
    await settle();
    expect(seen).toEqual([]);
    victim.close();
  });

  it('drops a reader-authored update frame', async () => {
    const { owner, reader, roster, contentKey } = await buildRoom();
    const { factory } = createHub();
    const victim = createEncryptedRelayTransport(ROOM, 'ws://relay', depsFor(owner, factory, roster, contentKey));
    const seen: Uint8Array[] = [];
    victim.onMessage((bytes) => seen.push(bytes));
    victim.connect();

    inject(factory, await sealAs(reader, 'update', 'reader-write', contentKey), 'update');
    await settle();
    expect(seen).toEqual([]);
    victim.close();
  });

  it('drops a tampered frame and delivers an untampered one', async () => {
    const { owner, writer, roster, contentKey } = await buildRoom();
    const { factory } = createHub();
    const victim = createEncryptedRelayTransport(ROOM, 'ws://relay', depsFor(owner, factory, roster, contentKey));
    const seen: Uint8Array[] = [];
    victim.onMessage((bytes) => seen.push(bytes));
    victim.connect();

    const tampered = await sealAs(writer, 'update', 'ok', contentKey);
    tampered.ct[0] ^= 0xff;
    inject(factory, tampered, 'update');
    await settle();
    expect(seen).toEqual([]);

    inject(factory, await sealAs(writer, 'update', 'ok', contentKey), 'update');
    await settle();
    expect(seen.length).toBe(1);
    victim.close();
  });

  it('resumes from the last seq without re-delivering earlier updates', async () => {
    const { owner, writer, roster, contentKey } = await buildRoom();
    const { factory } = createHub();
    const poster = createEncryptedRelayTransport(ROOM, 'ws://relay', depsFor(writer, factory, roster, contentKey));
    poster.connect();
    for (const payload of ['u1', 'u2', 'u3']) {
      poster.send(new Uint8Array([0, ...utf8(payload)]));
    }
    await settle();

    const seen: Uint8Array[] = [];
    const resumer = createEncryptedRelayTransport(
      ROOM,
      'ws://relay',
      depsFor(owner, factory, roster, contentKey, () => 2),
    );
    resumer.onMessage((bytes) => seen.push(bytes));
    resumer.connect();
    await settle();
    expect(seen.length).toBe(1);
    poster.close();
    resumer.close();
  });

  it('stacks with BroadcastChannel — a local tab and a remote peer each receive a local edit once', async () => {
    const { owner, writer, roster, contentKey } = await buildRoom();
    const { factory } = createHub();
    const bcName = 'stack-doc';
    const relayA = createEncryptedRelayTransport(ROOM, 'ws://relay', depsFor(owner, factory, roster, contentKey));
    const bcA = createBroadcastChannelTransport(bcName);
    relayA.connect();

    const remote = createEncryptedRelayTransport(ROOM, 'ws://relay', depsFor(writer, factory, roster, contentKey));
    const remoteSeen: Uint8Array[] = [];
    remote.onMessage((bytes) => remoteSeen.push(bytes));
    remote.connect();

    const tab = createBroadcastChannelTransport(bcName);
    const tabSeen: Uint8Array[] = [];
    tab.onMessage((bytes) => tabSeen.push(bytes));

    const da = new Y.Doc();
    const a = createYjsProvider({ docId: 'doc', ydoc: da, store: emptyStore, transports: [bcA, relayA], local: LOCAL_A });
    await a.connect();
    await settle();

    tabSeen.length = 0;
    remoteSeen.length = 0;
    da.getText('t').insert(0, 'z');
    await settle();
    expect(tabSeen.length).toBe(1);
    expect(remoteSeen.length).toBe(1);
    a.disconnect();
    tab.close();
    remote.close();
  });
});
