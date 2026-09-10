import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asDeviceId } from 'writer-sync/core';
import type { PeerSession } from 'writer-sync/providers/webrtc';
import type { DataChannelLike } from 'writer-sync/providers/webrtc';
import {
  buildChunkManifest,
  CATCH_UP_PROTOCOL_VERSION,
  decodeCatchUpMessage,
  encodeCatchUpMessage,
  TRANSFER_CHUNK_BYTES,
  type CatchUpMessage,
} from 'writer-sync/operations';
import { toBase64Url } from 'writer-sync/crypto';
import { TrustedDeviceStatus } from 'writer-sync/core';
import { LoremDB } from '@/db/LoremDB';
import { appLogger } from '@/lib/appLogger';
import { NoteKind, NoteState } from '@/db/schema';
import { asOperationId, asPrincipalId } from 'writer-sync/core';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import { forgetDeviceKeyRing, saveDeviceKeyRing } from '@/lib/cloud/crypto/keyStore';
import {
  decodeRootTransferMessage,
  encodeRootTransferMessage,
  type RootTransferMessage,
} from 'writer-sync/pairing';
import { createPeerCatchUp } from './peerCatchUp';
import { TRANSFER_DEADLINE_MILLIS } from './rootSecretHandover';
import { peerLinkStatus } from './peerLinkStatus';
import { peerSessions } from './peerSessionRegistry';

/**
 * The lifetime seam: a confirmed pairing hands its connection here, and catch-up
 * opens over whatever channel that session comes by — including one the *peer*
 * opened, which is the answering device's only route to a channel at all.
 */

const PEER = asDeviceId('peer-device');

/** Let every queued continuation, and the storage work behind it, run out. */
const settled = async (): Promise<void> => {
  for (let turn = 0; turn < 4; turn += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

let db: LoremDB;

/** A channel that records what was written and replays what is fed to it. */
const fakeChannel = (readyState: 'open' | 'connecting' = 'open') => {
  const listeners = new Map<string, ((event: MessageEvent<unknown>) => void)[]>();
  const sent: CatchUpMessage[] = [];
  const fire = (type: string): void => {
    for (const listener of listeners.get(type) ?? []) {
      listener({} as MessageEvent<unknown>);
    }
  };
  return {
    sent,
    /** Bring a connecting channel up, the way a real one settles. */
    open: (channel: { readyState: string }) => {
      channel.readyState = 'open';
      fire('open');
    },
    /** Deliver a message as the peer, over the wire the transport listens on. */
    deliver: (message: CatchUpMessage) => {
      const event = {
        data: encodeCatchUpMessage(message),
      } as unknown as MessageEvent<unknown>;
      for (const listener of listeners.get('message') ?? []) listener(event);
    },
    channel: {
      label: 'writer-sync-control',
      readyState,
      bufferedAmount: 0,
      bufferedAmountLowThreshold: 0,
      send: (data: ArrayBuffer) => sent.push(decodeCatchUpMessage(new Uint8Array(data))),
      close: vi.fn(),
      addEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => {
        listeners.set(type, [...(listeners.get(type) ?? []), listener]);
      },
      removeEventListener: (
        type: string,
        listener: (event: MessageEvent<unknown>) => void,
      ) => {
        listeners.set(
          type,
          (listeners.get(type) ?? []).filter((held) => held !== listener),
        );
      },
    } as unknown as DataChannelLike,
  };
};

/**
 * A session whose channel arrives when the test says so — or is already there.
 *
 * Delivering an existing channel synchronously on subscribe is not a
 * convenience: it is the real session's contract, and it is the normal case for
 * the device that created the channel itself. A double that only ever called
 * back later would agree with a subscriber that cannot survive being called
 * during its own subscription.
 */
const fakeSession = (existing: DataChannelLike | null = null) => {
  const subscribers = new Set<(channel: DataChannelLike) => void>();
  const anySubscribers = new Set<(channel: DataChannelLike) => void>();
  const close = vi.fn();
  let current = existing;
  const session: PeerSession = {
    channel: () => current,
    onChannel: (listener) => {
      if (current !== null) listener(current);
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    openChannel: () => new Promise<never>(() => undefined),
    onAnyChannel: (listener) => {
      anySubscribers.add(listener);
      return () => anySubscribers.delete(listener);
    },
    createOffer: () => Promise.resolve(''),
    acceptOffer: () => Promise.resolve(''),
    acceptAnswer: () => Promise.resolve(),
    // Catch-up cares about channels, not liveness: a session that never reports
    // a link state is enough here, and the registry's own tests drive drops.
    linkState: () => 'connected',
    onLinkStateChange: (listener) => {
      listener('connected');
      return () => undefined;
    },
    close,
  };
  return {
    session,
    close,
    openChannel: (channel: DataChannelLike) => {
      current = channel;
      for (const listener of subscribers) listener(channel);
    },
    /** A channel the peer opened arriving on the connection, scope or control. */
    arriveChannel: (channel: DataChannelLike) => {
      for (const listener of anySubscribers) listener(channel);
    },
    /** Whether adoption has reached the point of listening for peer channels. */
    listeningForChannels: () => anySubscribers.size > 0,
  };
};

/**
 * A channel that keeps every byte written to it and lets a test play the peer in
 * either protocol.
 *
 * Two protocols share this channel, so no single decoder can read everything
 * that crosses it — and unsubscribing has to work, because settling the key
 * conversation is what hands the channel on.
 */
const rawWire = () => {
  const raw: Uint8Array[] = [];
  const listeners: ((event: MessageEvent<unknown>) => void)[] = [];
  const channel = {
    label: 'writer-sync-control',
    readyState: 'open',
    bufferedAmount: 0,
    bufferedAmountLowThreshold: 0,
    send: (data: ArrayBuffer) => raw.push(new Uint8Array(data)),
    close: vi.fn(),
    addEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => {
      if (type === 'message') listeners.push(listener);
    },
    removeEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => {
      if (type !== 'message') return;
      const at = listeners.indexOf(listener);
      if (at >= 0) listeners.splice(at, 1);
    },
  } as unknown as DataChannelLike;

  const deliver = (bytes: Uint8Array): void => {
    // This realm's own buffer: the encoder's belongs to Node's under jsdom.
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    for (const listener of [...listeners]) {
      listener({ data: buffer } as MessageEvent<unknown>);
    }
  };

  return {
    channel,
    raw,
    deliverRoot: (message: RootTransferMessage) =>
      deliver(encodeRootTransferMessage(message)),
    deliverCatchUp: (message: CatchUpMessage) => deliver(encodeCatchUpMessage(message)),
    /** What crossed the wire, naming anything catch-up cannot read as the other protocol. */
    kinds: (): string[] =>
      raw.map((bytes) => {
        try {
          return decodeCatchUpMessage(bytes).kind;
        } catch {
          return 'root-transfer';
        }
      }),
  };
};

/** What a freshly confirmed pairing leaves behind for the root to travel on. */
const handoverFor = () => ({
  peer: {
    deviceId: PEER,
    publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
    peerEphemeralPublicJwk: { kty: 'EC', crv: 'P-256', x: 'e', y: 'f' },
    transcript: new Uint8Array([9]),
    verificationCode: '048213',
  expiresAt: Date.now() + 300_000,
  },
  sessionPrivateKey: null,
  deviceId: asDeviceId('this-device'),
});

beforeEach(async () => {
  db = new LoremDB('peer-catch-up');
  await db.open();
});

afterEach(async () => {
  await forgetDeviceKeyRing();
  await db.delete();
  // Both are page-lifetime singletons: anything a test leaves in them is state
  // the next test inherits.
  peerSessions.clear();
  peerLinkStatus.reset();
});

/** A space this device holds a key for, with one row of content in it. */
const seedScope = async (): Promise<void> => {
  await saveDeviceKeyRing({
    ring: await deriveKeyRing(generateRootSecret(), 1),
    accountId: null,
  });
  await db.spaces.put({
    id: 's1',
    accessScopeId: 's1',
    createdBy: asPrincipalId('me'),
    updatedBy: asPrincipalId('me'),
    mutationId: asOperationId('op-s1'),
    logicalUpdatedAt: { millis: 1000, counter: 0 },
    name: 'A space',
    template: 'blank',
    tag: 'space',
    shared: false,
    createdAt: 1000,
    updatedAt: 1000,
  });
  await db.notes.put({
    id: 'n1',
    accessScopeId: 's1',
    createdBy: asPrincipalId('me'),
    updatedBy: asPrincipalId('me'),
    mutationId: asOperationId('op-n1'),
    logicalUpdatedAt: { millis: 1000, counter: 0 },
    spaceId: 's1',
    l: 0,
    t: 0,
    w: 184,
    h: 80,
    kind: NoteKind.Note,
    state: NoteState.User,
    body: 'hello',
    createdAt: 1000,
  });
};

describe('createPeerCatchUp', () => {
  it('opens the exchange once the session has a channel', async () => {
    const peer = fakeSession();
    const wire = fakeChannel();
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({ session: peer.session, deviceId: PEER });
    // Nothing is sent before a channel exists — the answering device has none
    // until its peer opens one.
    expect(wire.sent).toEqual([]);

    peer.openChannel(wire.channel);

    await vi.waitFor(() => {
      expect(wire.sent).toEqual([{ v: 1, kind: 'manifest', manifests: [] }]);
    });
    catchUp.stop();
  });

  it('opens the exchange over a channel the session already holds', async () => {
    const wire = fakeChannel();
    // The initiating device created the control channel during pairing, so by
    // the time a human has confirmed the codes it is already open.
    const peer = fakeSession(wire.channel);
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({ session: peer.session, deviceId: PEER });

    await vi.waitFor(() => {
      expect(wire.sent).toEqual([{ v: 1, kind: 'manifest', manifests: [] }]);
    });
    catchUp.stop();
  });

  it('adopts a session once, however many times it is offered', async () => {
    const peer = fakeSession();
    const wire = fakeChannel();
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({ session: peer.session, deviceId: PEER });
    await catchUp.adopt({ session: peer.session, deviceId: PEER });
    peer.openChannel(wire.channel);

    await vi.waitFor(() => {
      expect(wire.sent).toHaveLength(1);
    });
    catchUp.stop();
  });

  it('rebuilds current state for a peer with no starting point', async () => {
    await seedScope();
    const wire = fakeChannel();
    const peer = fakeSession(wire.channel);
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({ session: peer.session, deviceId: PEER });
    await vi.waitFor(() => {
      expect(wire.sent).toHaveLength(1);
    });

    // A peer that has never synchronised cannot be answered from history — this
    // device's journal holds nothing for the scope — so it is served the scope
    // as it stands now rather than an empty reply that reads as "caught up".
    wire.deliver({
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'request',
      requests: [{ accessScopeId: 's1', originDeviceId: PEER }],
    });

    await vi.waitFor(() => {
      const frames = wire.sent.filter((message) => message.kind === 'frames');
      expect(frames).toHaveLength(1);
      // The space row belongs to the scope as much as the note does: a rebuild
      // that described only the contents would land a note in no space.
      expect(
        frames[0].kind === 'frames' && frames[0].frames.map((f) => f.entityId).sort(),
      ).toEqual(['n1', 's1']);
    });
    catchUp.stop();
  });

  describe('what it offers a peer', () => {
    /** One journalled operation, as the middleware would have written it. */
    const journal = async (options: {
      accessScopeId: string;
      entityId: string;
      kind: 'put' | 'delete';
      operationId: string;
      millis?: number;
    }): Promise<void> => {
      await db.syncOperations.put({
        v: 1,
        operationId: asOperationId(options.operationId),
        accessScopeId: options.accessScopeId,
        entityTable: 'spaces',
        entityId: options.entityId,
        kind: options.kind,
        deviceId: asDeviceId('this-device'),
        logicalAt: { millis: options.millis ?? 1000, counter: 0 },
        keyId: 'key-1',
        epoch: 1,
        payloadHash: 'hash',
        payload: 'sealed',
        signature: 'signed',
      });
    };

    const scopesOffered = async (): Promise<string[]> => {
      const wire = fakeChannel();
      const peer = fakeSession(wire.channel);
      const catchUp = createPeerCatchUp(db);
      await catchUp.adopt({ session: peer.session, deviceId: PEER });
      await vi.waitFor(() => {
        expect(wire.sent).toHaveLength(1);
      });
      const [first] = wire.sent;
      catchUp.stop();
      return first.kind === 'manifest'
        ? first.manifests.map((scope) => scope.accessScopeId).sort()
        : [];
    };

    beforeEach(async () => {
      await saveDeviceKeyRing({
        ring: await deriveKeyRing(generateRootSecret(), 1),
        accountId: null,
      });
    });

    it('offers a scope whose rows are gone, so a deletion can travel', async () => {
      // Deleting a space removes every row it had and journals a tombstone.
      // Answering from the rows that survive dropped the scope from the manifest
      // altogether, so the peer was never told there was anything newer to ask
      // for: it kept the space, and the deletion had no route across at all.
      await journal({
        accessScopeId: 's1',
        entityId: 's1',
        kind: 'delete',
        operationId: 'op-s1-gone',
      });

      expect(await db.spaces.get('s1')).toBeUndefined();
      expect(await scopesOffered()).toEqual(['s1']);
    });

    it('offers every scope it holds, deleted and living alike', async () => {
      // The case a real device is in: several spaces, some still here, one
      // deleted. All of them have history the peer may be missing.
      await seedScope();
      await journal({
        accessScopeId: 's1',
        entityId: 's1',
        kind: 'put',
        operationId: 'op-s1',
      });
      await journal({
        accessScopeId: 's2',
        entityId: 's2',
        kind: 'put',
        operationId: 'op-s2',
      });
      await journal({
        accessScopeId: 's3',
        entityId: 's3',
        kind: 'delete',
        operationId: 'op-s3-gone',
        millis: 2000,
      });

      expect(await scopesOffered()).toEqual(['s1', 's2', 's3']);
    });

    it('offers a scope added since the last exchange', async () => {
      await journal({
        accessScopeId: 's1',
        entityId: 's1',
        kind: 'put',
        operationId: 'op-s1',
      });
      expect(await scopesOffered()).toEqual(['s1']);

      await journal({
        accessScopeId: 's2',
        entityId: 's2',
        kind: 'put',
        operationId: 'op-s2',
        millis: 3000,
      });

      expect(await scopesOffered()).toEqual(['s1', 's2']);
    });

    it('offers a scope it deleted and then made again', async () => {
      // Deleting and recreating leaves both operations in the journal under one
      // scope; convergence decides which stands, and the peer needs both.
      await journal({
        accessScopeId: 's1',
        entityId: 's1',
        kind: 'delete',
        operationId: 'op-s1-gone',
        millis: 1000,
      });
      await journal({
        accessScopeId: 's1',
        entityId: 's1',
        kind: 'put',
        operationId: 'op-s1-again',
        millis: 2000,
      });

      expect(await scopesOffered()).toEqual(['s1']);
    });

    it('offers nothing at all while the device holds no key', async () => {
      await forgetDeviceKeyRing();
      await journal({
        accessScopeId: 's1',
        entityId: 's1',
        kind: 'put',
        operationId: 'op-s1',
      });

      expect(await scopesOffered()).toEqual([]);
    });
  });

  it('waits for a channel that is still connecting before writing to it', async () => {
    const wire = fakeChannel('connecting');
    const peer = fakeSession(wire.channel);
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({ session: peer.session, deviceId: PEER });

    // The device that creates a channel holds it in `connecting` while the
    // connection forms, and writing to it then throws — which is how one side
    // of a pairing ended up sending nothing at all.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(wire.sent).toEqual([]);

    wire.open(wire.channel as unknown as { readyState: string });

    await vi.waitFor(() => {
      expect(wire.sent).toEqual([{ v: 1, kind: 'manifest', manifests: [] }]);
    });
    catchUp.stop();
  });

  it('records the peer as trusted once the root has crossed, and not before', async () => {
    // Both devices hold key material, so the key conversation settles without a
    // root moving — the conversation still has to happen.
    await saveDeviceKeyRing({
      ring: await deriveKeyRing(generateRootSecret(), 1),
      accountId: null,
    });
    const wire = rawWire();
    const peer = fakeSession(wire.channel);
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      secretHandover: handoverFor(),
    });

    // A pairing cut short here must leave no record: there is no cleanup step
    // a crash cannot skip.
    expect(await db.trustedDevices.count()).toBe(0);

    wire.deliverRoot({ v: 1, kind: 'holds-root' });
    wire.deliverRoot({ v: 1, kind: 'ready' });

    await vi.waitFor(async () => {
      const record = await db.trustedDevices.get(String(PEER));
      expect(record?.status).toBe(TrustedDeviceStatus.Active);
      expect(record?.publicIdentityJwk).toEqual({ kty: 'EC', crv: 'P-256', x: 'x', y: 'y' });
    });
    catchUp.stop();
  });

  it('writes nothing when the pairing is cut short while the root is still moving', async () => {
    const warn = vi.spyOn(appLogger, 'warn').mockImplementation(() => undefined);
    const wire = rawWire();
    const peer = fakeSession(wire.channel);
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      secretHandover: handoverFor(),
    });
    // The tab closing, the process going and the connection dropping are the
    // same thing here: none of them run a cleanup step.
    catchUp.stop();

    // Flushed before reading: a write queued behind the callback chain would
    // otherwise land after the assertion and never be seen.
    await settled();
    expect(warn).toHaveBeenCalledWith('a pairing ended without the root moving', {
      status: 'cancelled',
    });
    expect(await db.trustedDevices.count()).toBe(0);
    warn.mockRestore();
  });

  it('writes nothing when the peer never finishes the key conversation', async () => {
    const warn = vi.spyOn(appLogger, 'warn').mockImplementation(() => undefined);
    // Real time keeps flowing for IndexedDB underneath; only the deadline is
    // driven, since the storage this asserts on cannot run on a frozen clock.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const wire = rawWire();
      const peer = fakeSession(wire.channel);
      const catchUp = createPeerCatchUp(db);

      await catchUp.adopt({
        session: peer.session,
        deviceId: PEER,
        secretHandover: handoverFor(),
      });
      // Ten seconds of silence. This device once carried on and synced anyway.
      await vi.advanceTimersByTimeAsync(TRANSFER_DEADLINE_MILLIS);
      // Every queued continuation and the storage work behind it, before any
      // assertion: a commit that lands late would otherwise go unseen.
      await settled();

      // Silence is not agreement. Reporting it as a settlement is what let ten
      // seconds of nothing commit a device.
      expect(warn).toHaveBeenCalledWith('a pairing ended without the root moving', {
        status: 'timed-out',
      });
      expect(await db.trustedDevices.count()).toBe(0);
      expect(peer.listeningForChannels()).toBe(false);
      expect(peerSessions.peers()).toEqual([]);
      expect(wire.kinds()).not.toContain('manifest');
    } finally {
      vi.useRealTimers();
      warn.mockRestore();
    }
  });

  it('leaves a removed device removed when the peer never finishes', async () => {
    const warn = vi.spyOn(appLogger, 'warn').mockImplementation(() => undefined);
    const now = Date.now();
    await db.trustedDevices.put({
      deviceId: PEER,
      publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
      principalId: asPrincipalId('me'),
      addedAt: now - 5_000,
      lastSessionAt: now - 5_000,
      displayName: 'Old laptop',
      status: TrustedDeviceStatus.Revoked,
      revokedAt: now - 1_000,
      acknowledgedOperations: {},
    });
    // Real time keeps flowing for IndexedDB underneath; only the deadline is
    // driven, since the storage this asserts on cannot run on a frozen clock.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const wire = rawWire();
      const peer = fakeSession(wire.channel);
      const catchUp = createPeerCatchUp(db);

      await catchUp.adopt({
        session: peer.session,
        deviceId: PEER,
        secretHandover: handoverFor(),
      });
      await vi.advanceTimersByTimeAsync(TRANSFER_DEADLINE_MILLIS);
      // Every queued continuation and the storage work behind it, before any
      // assertion: a commit that lands late would otherwise go unseen.
      await settled();

      expect(warn).toHaveBeenCalledWith('a pairing ended without the root moving', {
        status: 'timed-out',
      });
      const record = await db.trustedDevices.get(String(PEER));
      expect(record?.status).toBe(TrustedDeviceStatus.Revoked);
      expect(record?.revokedAt).toBe(now - 1_000);
      // Untouched, not restored: nothing wrote to it in the first place.
      expect(record?.lastSessionAt).toBe(now - 5_000);
      expect(record?.displayName).toBe('Old laptop');
    } finally {
      vi.useRealTimers();
      warn.mockRestore();
    }
  });

  it('grants no sync authority while the root is still moving', async () => {
    const wire = rawWire();
    const peer = fakeSession(wire.channel);
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      secretHandover: handoverFor(),
    });

    // A scope channel is ordinary sync authority, which an unfinished pairing
    // does not have.
    expect(peer.listeningForChannels()).toBe(false);
    const scope = fakeChannel();
    (scope.channel as unknown as { label: string }).label = 's1/doc-updates';
    peer.arriveChannel(scope.channel);
    expect(scope.sent).toEqual([]);

    expect(peerSessions.peers()).toEqual([]);
    expect(wire.kinds()).not.toContain('manifest');
    catchUp.stop();
  });

  it('commits once, and only then syncs and takes up scope channels', async () => {
    await saveDeviceKeyRing({
      ring: await deriveKeyRing(generateRootSecret(), 1),
      accountId: null,
    });
    let written = 0;
    const count = (): void => {
      written += 1;
    };
    db.trustedDevices.hook('creating', count);
    const wire = rawWire();
    const peer = fakeSession(wire.channel);
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      secretHandover: handoverFor(),
    });
    wire.deliverRoot({ v: 1, kind: 'holds-root' });
    wire.deliverRoot({ v: 1, kind: 'ready' });

    await vi.waitFor(() => {
      expect(wire.kinds()).toContain('manifest');
    });
    db.trustedDevices.hook('creating').unsubscribe(count);
    expect(written).toBe(1);
    expect(peer.listeningForChannels()).toBe(true);
    expect(peerSessions.peers().map((one) => one.deviceId)).toEqual([PEER]);
    catchUp.stop();
  });

  it('syncs nothing when the record cannot be written', async () => {
    await saveDeviceKeyRing({
      ring: await deriveKeyRing(generateRootSecret(), 1),
      accountId: null,
    });
    const warn = vi.spyOn(appLogger, 'warn').mockImplementation(() => undefined);
    const refuse = (): never => {
      throw new Error('the registry refused this device');
    };
    db.trustedDevices.hook('creating', refuse);
    const wire = rawWire();
    const peer = fakeSession(wire.channel);
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      secretHandover: handoverFor(),
    });
    wire.deliverRoot({ v: 1, kind: 'holds-root' });
    wire.deliverRoot({ v: 1, kind: 'ready' });

    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith('recording a paired device failed', expect.anything());
    });
    db.trustedDevices.hook('creating').unsubscribe(refuse);
    expect(wire.kinds()).not.toContain('manifest');
    expect(peer.close).toHaveBeenCalled();
    expect(await db.trustedDevices.count()).toBe(0);
  });

  it('leaves no trust behind when the pairing expired before the root moved', async () => {
    const wire = rawWire();
    const peer = fakeSession(wire.channel);
    const catchUp = createPeerCatchUp(db);
    const onExpired = vi.fn();
    const handover = handoverFor();

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      secretHandover: {
        ...handover,
        // Already past: the human compared the codes too late.
        peer: { ...handover.peer, expiresAt: Date.now() - 1 },
        onExpired,
      },
    });

    // The peer asks for a root this device can no longer seal.
    wire.deliverRoot({ v: 1, kind: 'needs-root' });

    await vi.waitFor(() => {
      expect(onExpired).toHaveBeenCalledTimes(1);
    });
    // A device the registry vouches for on the strength of a handover that
    // never happened is exactly what must not be left behind.
    await vi.waitFor(async () => {
      expect(await db.trustedDevices.get(String(PEER))).toBeUndefined();
    });
    expect(peer.close).toHaveBeenCalled();
    // Nothing was sealed, and catch-up never opened over a link the peer
    // cannot read.
    expect(wire.kinds()).not.toContain('manifest');
    catchUp.stop();
  });

  it('puts a device an expired pairing reactivated back where it found it', async () => {
    const now = Date.now();
    const key = { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' };
    await db.trustedDevices.put({
      deviceId: PEER,
      publicIdentityJwk: key,
      principalId: asPrincipalId('me'),
      addedAt: now - 5_000,
      lastSessionAt: now - 5_000,
      displayName: 'Old laptop',
      status: TrustedDeviceStatus.Revoked,
      revokedAt: now - 1_000,
      acknowledgedOperations: {},
    });
    const wire = rawWire();
    const peer = fakeSession(wire.channel);
    const catchUp = createPeerCatchUp(db);
    const onExpired = vi.fn();
    const handover = handoverFor();

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      secretHandover: {
        ...handover,
        peer: { ...handover.peer, expiresAt: Date.now() - 1 },
        onExpired,
      },
    });

    wire.deliverRoot({ v: 1, kind: 'needs-root' });

    await vi.waitFor(() => {
      expect(onExpired).toHaveBeenCalledTimes(1);
    });
    // A removal is undone by a pairing that finished. This one did not, so the
    // device the user removed is still removed — the record cannot be left
    // saying the registry trusts a device the handover never reached.
    await vi.waitFor(async () => {
      const record = await db.trustedDevices.get(String(PEER));
      expect(record?.status).toBe(TrustedDeviceStatus.Revoked);
    });
    const record = await db.trustedDevices.get(String(PEER));
    expect(record?.revokedAt).toBe(now - 1_000);
    expect(record?.publicIdentityJwk).toEqual(key);
    expect(record?.displayName).toBe('Old laptop');
    expect(record?.addedAt).toBe(now - 5_000);
    catchUp.stop();
  });

  it('leaves a device that was already trusted trusted when a pairing expires', async () => {
    const now = Date.now();
    const key = { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' };
    await db.trustedDevices.put({
      deviceId: PEER,
      publicIdentityJwk: key,
      principalId: asPrincipalId('me'),
      addedAt: now - 5_000,
      lastSessionAt: now - 5_000,
      displayName: 'Old laptop',
      status: TrustedDeviceStatus.Active,
      acknowledgedOperations: {},
    });
    const wire = rawWire();
    const peer = fakeSession(wire.channel);
    const catchUp = createPeerCatchUp(db);
    const onExpired = vi.fn();
    const handover = handoverFor();

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      secretHandover: {
        ...handover,
        peer: { ...handover.peer, expiresAt: Date.now() - 1 },
        onExpired,
      },
    });

    wire.deliverRoot({ v: 1, kind: 'needs-root' });

    await vi.waitFor(() => {
      expect(onExpired).toHaveBeenCalledTimes(1);
    });
    // Nothing about this device's trust was this pairing's to give, so a
    // pairing that failed has nothing to take away.
    const record = await db.trustedDevices.get(String(PEER));
    expect(record?.status).toBe(TrustedDeviceStatus.Active);
    expect(record?.revokedAt).toBeUndefined();
    catchUp.stop();
  });

  it('closes every adopted session when it stops', async () => {
    const first = fakeSession();
    const second = fakeSession();
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({ session: first.session, deviceId: PEER });
    await catchUp.adopt({ session: second.session, deviceId: asDeviceId('other-device') });
    catchUp.stop();

    expect(first.close).toHaveBeenCalledTimes(1);
    expect(second.close).toHaveBeenCalledTimes(1);
  });

  it('asks for nothing while the device holds no key', async () => {
    const peer = fakeSession();
    const wire = fakeChannel();
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({ session: peer.session, deviceId: PEER });
    peer.openChannel(wire.channel);

    // A keyless device can decrypt no scope, so it advertises none rather than
    // collecting ciphertext it could never read.
    await vi.waitFor(() => {
      expect(wire.sent[0]).toEqual({ v: 1, kind: 'manifest', manifests: [] });
    });
    catchUp.stop();
  });

  it('refuses a re-pairing whose identity key differs, and opens nothing', async () => {
    const now = Date.now();
    const original = { kty: 'EC', crv: 'P-256', x: 'first', y: 'key' };
    await db.trustedDevices.put({
      deviceId: PEER,
      publicIdentityJwk: original,
      principalId: asPrincipalId('me'),
      addedAt: now - 5_000,
      lastSessionAt: now - 5_000,
      displayName: 'Old laptop',
      status: TrustedDeviceStatus.Active,
      acknowledgedOperations: {},
    });
    const peer = fakeSession();
    const catchUp = createPeerCatchUp(db);

    // A different key than the record holds: substitution, not reconnection.
    await expect(
      catchUp.adopt({
        session: peer.session,
        deviceId: PEER,
        secretHandover: {
          peer: {
            deviceId: PEER,
            publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'second', y: 'key' },
            peerEphemeralPublicJwk: { kty: 'EC', crv: 'P-256', x: 'e', y: 'f' },
            transcript: new Uint8Array([1, 2, 3]),
            verificationCode: '048213',
  expiresAt: Date.now() + 300_000,
          },
          sessionPrivateKey: null,
          deviceId: asDeviceId('this-device'),
        },
      }),
    ).rejects.toThrow(/trusted-key-mismatch/);

    // The record is untouched — not even the session timestamp moves — and the
    // session is closed rather than left to exchange frames the verifier would
    // refuse one by one.
    const record = await db.trustedDevices.get(String(PEER));
    expect(record?.publicIdentityJwk).toEqual(original);
    expect(record?.displayName).toBe('Old laptop');
    expect(record?.lastSessionAt).toBe(now - 5_000);
    expect(peer.close).toHaveBeenCalledTimes(1);
    catchUp.stop();
  });

  it('reactivates a revoked device only once the root has crossed', async () => {
    await saveDeviceKeyRing({
      ring: await deriveKeyRing(generateRootSecret(), 1),
      accountId: null,
    });
    const now = Date.now();
    const key = { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' };
    await db.trustedDevices.put({
      deviceId: PEER,
      publicIdentityJwk: key,
      principalId: asPrincipalId('me'),
      addedAt: now - 5_000,
      lastSessionAt: now - 5_000,
      displayName: 'Old laptop',
      status: TrustedDeviceStatus.Revoked,
      revokedAt: now - 1_000,
      acknowledgedOperations: {},
    });
    const wire = rawWire();
    const peer = fakeSession(wire.channel);
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      secretHandover: handoverFor(),
    });

    // Confirming the digits is not finishing: until the root crosses, the
    // device the user removed is still removed.
    const held = await db.trustedDevices.get(String(PEER));
    expect(held?.status).toBe(TrustedDeviceStatus.Revoked);
    expect(held?.revokedAt).toBe(now - 1_000);

    wire.deliverRoot({ v: 1, kind: 'holds-root' });
    wire.deliverRoot({ v: 1, kind: 'ready' });

    await vi.waitFor(async () => {
      const record = await db.trustedDevices.get(String(PEER));
      expect(record?.status).toBe(TrustedDeviceStatus.Active);
      expect(record?.revokedAt).toBeUndefined();
    });
    const record = await db.trustedDevices.get(String(PEER));
    expect(record?.publicIdentityJwk).toEqual(key);
    expect(record?.displayName).toBe('Old laptop');
    catchUp.stop();
  });

  it('credits an acknowledgement to the peer that read it, not to its author', async () => {
    // The peer on the connection is what has read up to here; the origin is
    // whose operations it read. Conflating them credits the wrong device and
    // lets compaction drop frames that peer never received.
    await db.trustedDevices.put({
      deviceId: PEER,
      publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
      principalId: asPrincipalId('me'),
      addedAt: 1000,
      displayName: 'Phone',
      status: TrustedDeviceStatus.Active,
      acknowledgedOperations: {},
    });
    const wire = fakeChannel();
    const catchUp = createPeerCatchUp(db);
    await catchUp.adopt({ session: fakeSession(wire.channel).session, deviceId: PEER });

    wire.deliver({
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'ack',
      acknowledgements: [
        {
          accessScopeId: 's1',
          originDeviceId: asDeviceId('some-other-device'),
          operationId: asOperationId('op-read'),
        },
      ],
    });

    await vi.waitFor(async () => {
      const record = await db.trustedDevices.get(String(PEER));
      expect(record?.acknowledgedOperations).toEqual({
        s1: { 'some-other-device': 'op-read' },
      });
    });
    // The author of the operations is not the reader, and gains no record here.
    expect(await db.trustedDevices.get('some-other-device')).toBeUndefined();
    catchUp.stop();
  });

  it('logs a frame it refuses instead of failing the exchange', async () => {
    await seedScope();
    const warn = vi.spyOn(appLogger, 'warn').mockImplementation(() => undefined);
    const wire = fakeChannel();
    const catchUp = createPeerCatchUp(db);
    await catchUp.adopt({ session: fakeSession(wire.channel).session, deviceId: PEER });

    // Nothing about this frame checks out — its payload does not match its
    // hash, and it is signed by a device no pairing established. A refusal is
    // one bad frame, not a broken connection: the exchange stays up.
    wire.deliver({
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'frames',
      frames: [
        {
          v: 1,
          operationId: asOperationId('op-untrusted'),
          accessScopeId: 's1',
          entityTable: 'notes',
          entityId: 'n9',
          kind: 'put',
          deviceId: asDeviceId('stranger'),
          logicalAt: { millis: 2000, counter: 0 },
          keyId: 'key-1',
          epoch: 1,
          payloadHash: 'hash',
          payload: 'sealed',
          signature: 'signed',
        },
      ],
      final: true,
    });

    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledTimes(1);
    });
    // Named in the log, so a refusal can be traced to the frame it was about.
    // Which error the engine refused it with is the engine's business.
    expect(warn.mock.calls[0]?.[0]).toBe('refused a frame from a peer');
    expect(warn.mock.calls[0]?.[1]).toMatchObject({ operationId: 'op-untrusted' });
    expect(await db.syncOperations.get('op-untrusted')).toBeUndefined();
    catchUp.stop();
  });

  it('syncs over a scope channel its peer opened, ignoring the control label', async () => {
    const peer = fakeSession();
    const catchUp = createPeerCatchUp(db);
    await catchUp.adopt({ session: peer.session, deviceId: PEER });
    // Adoption records trust before it listens; a channel can only arrive once
    // someone is listening for it.
    await vi.waitFor(() => {
      expect(peer.listeningForChannels()).toBe(true);
    });

    // The control channel is spoken for; a second listener on it would race the
    // one the adoption already set up.
    const control = fakeChannel();
    (control.channel as unknown as { label: string }).label = 'writer-sync-control';
    peer.arriveChannel(control.channel);

    // A scope channel is how this device receives work in a scope it is not
    // writing to itself, and so has never asked for a channel for.
    const scope = fakeChannel();
    (scope.channel as unknown as { label: string }).label = 's1/doc-updates';
    peer.arriveChannel(scope.channel);

    await vi.waitFor(() => {
      expect(scope.sent).toEqual([{ v: 1, kind: 'manifest', manifests: [] }]);
    });
    expect(control.sent).toEqual([]);
    catchUp.stop();
  });

  it('hands the channel to the root transfer first, and syncs only after', async () => {
    // Both devices already hold key material, so nothing moves — the key
    // conversation is still had, and catch-up still waits for it to finish.
    await saveDeviceKeyRing({
      ring: await deriveKeyRing(generateRootSecret(), 1),
      accountId: null,
    });
    // Raw capture: two protocols take turns on this channel, so one decoder
    // cannot read everything sent.
    const raw: Uint8Array[] = [];
    const listeners: ((event: MessageEvent<unknown>) => void)[] = [];
    // Read at the moment catch-up first speaks, not after. A record written
    // later is one that every frame arriving until then was refused against.
    let trustedWhenSyncing: Promise<number> | null = null;
    const channel = {
      label: 'writer-sync-control',
      readyState: 'open',
      bufferedAmount: 0,
      bufferedAmountLowThreshold: 0,
      send: (data: ArrayBuffer) => {
        const bytes = new Uint8Array(data);
        raw.push(bytes);
        try {
          decodeCatchUpMessage(bytes);
        } catch {
          return;
        }
        trustedWhenSyncing ??= db.trustedDevices.count();
      },
      close: vi.fn(),
      addEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => {
        if (type === 'message') listeners.push(listener);
      },
      removeEventListener: () => undefined,
    } as unknown as DataChannelLike;
    const peer = fakeSession(channel);
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      secretHandover: {
        peer: {
          deviceId: PEER,
          publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
          peerEphemeralPublicJwk: { kty: 'EC', crv: 'P-256', x: 'e', y: 'f' },
          transcript: new Uint8Array([9]),
          verificationCode: '048213',
  expiresAt: Date.now() + 300_000,
        },
        sessionPrivateKey: null,
        deviceId: asDeviceId('this-device'),
      },
    });

    // Key material first: what goes out is the transfer's announcement, and no
    // catch-up manifest — a device still waiting for a root can decrypt
    // nothing, so syncing now would tell it, wrongly, that it is caught up.
    await vi.waitFor(() => {
      expect(raw.length).toBeGreaterThan(0);
    });
    expect(decodeRootTransferMessage(raw[0]).kind).toBe('holds-root');
    expect(() => decodeCatchUpMessage(raw[0])).toThrow();

    // The peer answers and both sides finish the key conversation; only then
    // does catch-up open over the same channel.
    const deliver = (message: RootTransferMessage): void => {
      const encoded = encodeRootTransferMessage(message);
      const buffer = new ArrayBuffer(encoded.byteLength);
      new Uint8Array(buffer).set(encoded);
      for (const listener of listeners) listener({ data: buffer } as MessageEvent<unknown>);
    };
    deliver({ v: 1, kind: 'holds-root' });
    deliver({ v: 1, kind: 'ready' });

    const kindsSoFar = (): string[] =>
      raw.map((bytes) => {
        try {
          return decodeCatchUpMessage(bytes).kind;
        } catch {
          return 'root-transfer';
        }
      });

    await vi.waitFor(() => {
      expect(kindsSoFar()).toContain('manifest');
    });
    // Order is the point, not adjacency: the transfer keeps saying its piece
    // until the peer agrees, so what matters is that no manifest preceded it.
    expect(kindsSoFar().indexOf('manifest')).toBeGreaterThan(0);
    // And the peer was already trusted by then. Catch-up opening first would
    // have the verifier refuse every frame it drew, one at a time, over a
    // connection that looked healthy.
    expect(await trustedWhenSyncing).toBe(1);
    catchUp.stop();
  });

  it('answers a peer that started syncing before the key conversation ended', async () => {
    // Neither device can see when its peer moves on: each waits for key material
    // on a deadline of its own, so the one whose deadline passes first starts
    // syncing while the other is still listening for keys. A manifest is sent
    // once and never repeated, so refusing it cost the exchange in that
    // direction for the life of the session — the device reported itself synced
    // and then never asked for anything.
    await saveDeviceKeyRing({
      ring: await deriveKeyRing(generateRootSecret(), 1),
      accountId: null,
    });
    const wire = rawWire();
    const peer = fakeSession(wire.channel);
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      secretHandover: handoverFor(),
    });
    await vi.waitFor(() => {
      expect(wire.raw.length).toBeGreaterThan(0);
    });

    // Early: this device is still reading for key material.
    wire.deliverCatchUp({
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'manifest',
      manifests: [],
    });
    // Now the key conversation finishes and catch-up takes the channel over.
    wire.deliverRoot({ v: 1, kind: 'holds-root' });
    wire.deliverRoot({ v: 1, kind: 'ready' });

    // The manifest is answered, late but answered: a request is this device
    // asking for what that manifest said the peer holds.
    await vi.waitFor(() => {
      expect(wire.kinds()).toContain('request');
    });
    catchUp.stop();
  });

  it('does not report the tail of the key conversation as a sync failure', async () => {
    // The slower device keeps saying `ready` every half second until it hears
    // back, and those repeats arrive after the faster one has handed the channel
    // to catch-up, whose decoder knows nothing of that word.
    const warn = vi.spyOn(appLogger, 'warn').mockImplementation(() => undefined);
    await saveDeviceKeyRing({
      ring: await deriveKeyRing(generateRootSecret(), 1),
      accountId: null,
    });
    const wire = rawWire();
    const peer = fakeSession(wire.channel);
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      secretHandover: handoverFor(),
    });
    await vi.waitFor(() => {
      expect(wire.raw.length).toBeGreaterThan(0);
    });
    wire.deliverRoot({ v: 1, kind: 'holds-root' });
    wire.deliverRoot({ v: 1, kind: 'ready' });
    await vi.waitFor(() => {
      expect(wire.kinds()).toContain('manifest');
    });

    wire.deliverRoot({ v: 1, kind: 'ready' });
    // A refusal is reported from a rejected promise, so give it its turn before
    // concluding that none happened.
    await Promise.resolve();
    await Promise.resolve();

    expect(warn).not.toHaveBeenCalledWith('peer catch-up failed', expect.anything());
    catchUp.stop();
  });

  it('persists attachment progress and resumes it over a later peer exchange', async () => {
    const content = new Uint8Array(TRANSFER_CHUNK_BYTES + 3);
    const manifest = await buildChunkManifest({
      attachmentId: 'a1',
      content,
      chunkBytes: TRANSFER_CHUNK_BYTES,
    });
    await db.syncOperations.put({
      v: 1,
      operationId: asOperationId('op-a1'),
      accessScopeId: 's1',
      entityTable: 'noteAttachments',
      entityId: 'a1',
      kind: 'put',
      deviceId: PEER,
      logicalAt: { millis: 1000, counter: 0 },
      keyId: 'key-1',
      epoch: 1,
      payloadHash: 'hash',
      payload: 'sealed',
      signature: 'signed',
    });

    const firstWire = fakeChannel();
    const firstSession = fakeSession(firstWire.channel);
    const firstCatchUp = createPeerCatchUp(db);
    await firstCatchUp.adopt({
      session: firstSession.session,
      deviceId: PEER,
    });
    await vi.waitFor(() => {
      expect(firstWire.sent[0]?.kind).toBe('manifest');
    });
    firstWire.deliver({
      v: 1,
      kind: 'attachment-offer',
      cursor: 0,
      manifests: [manifest],
    });
    await vi.waitFor(() => {
      expect(firstWire.sent.at(-1)).toMatchObject({
        kind: 'attachment-request',
        indices: [0, 1],
      });
    });
    firstWire.deliver({
      v: 1,
      kind: 'attachment-chunk',
      chunk: {
        attachmentId: 'a1',
        index: 0,
        bytes: toBase64Url(content.subarray(0, TRANSFER_CHUNK_BYTES)),
      },
    });
    await vi.waitFor(async () => {
      expect(await db.syncAttachmentChunks.get(['a1', 0])).toBeDefined();
    });
    firstCatchUp.stop();

    const resumedWire = fakeChannel();
    const resumedSession = fakeSession(resumedWire.channel);
    const resumedCatchUp = createPeerCatchUp(db);
    await resumedCatchUp.adopt({
      session: resumedSession.session,
      deviceId: PEER,
    });
    resumedWire.deliver({
      v: 1,
      kind: 'attachment-offer',
      cursor: 0,
      manifests: [manifest],
    });
    await vi.waitFor(() => {
      expect(resumedWire.sent.at(-1)).toMatchObject({
        kind: 'attachment-request',
        indices: [1],
      });
    });
    resumedCatchUp.stop();
  });
});
