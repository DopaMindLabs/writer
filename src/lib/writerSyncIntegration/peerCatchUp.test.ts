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
import { NoteKind, NoteState } from '@/db/schema';
import { asOperationId, asPrincipalId } from 'writer-sync/core';
import { deriveKeyRing, generateMasterSecret } from '@/lib/cloud/crypto/keys';
import { forgetDeviceKeyRing, saveDeviceKeyRing } from '@/lib/cloud/crypto/keyStore';
import {
  decodeRootTransferMessage,
  encodeRootTransferMessage,
  type RootTransferMessage,
} from 'writer-sync/pairing';
import { createPeerCatchUp } from './peerCatchUp';

/**
 * The lifetime seam: a confirmed pairing hands its connection here, and catch-up
 * opens over whatever channel that session comes by — including one the *peer*
 * opened, which is the answering device's only route to a channel at all.
 */

const PEER = asDeviceId('peer-device');

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

beforeEach(async () => {
  db = new LoremDB('peer-catch-up');
  await db.open();
});

afterEach(async () => {
  await forgetDeviceKeyRing();
  await db.delete();
});

/** A space this device holds a key for, with one row of content in it. */
const seedScope = async (): Promise<void> => {
  await saveDeviceKeyRing({
    ring: await deriveKeyRing(generateMasterSecret(), 1),
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

  it('records the peer as trusted when a pairing is adopted', async () => {
    const peer = fakeSession();
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      keyTransfer: {
        peer: {
          deviceId: PEER,
          publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
          peerEphemeralPublicJwk: { kty: 'EC', crv: 'P-256', x: 'e', y: 'f' },
          transcript: new Uint8Array([1, 2, 3]),
          verificationCode: '048213',
        },
        sessionPrivateKey: null,
        deviceId: asDeviceId('this-device'),
      },
    });

    // Without this record every frame the peer sends is refused: the verifier
    // checks a signature against the identity key a pairing established, and a
    // device it has never heard of has none.
    await vi.waitFor(async () => {
      const record = await db.trustedDevices.get(String(PEER));
      expect(record?.status).toBe(TrustedDeviceStatus.Active);
      expect(record?.publicIdentityJwk).toEqual({ kty: 'EC', crv: 'P-256', x: 'x', y: 'y' });
    });
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
        keyTransfer: {
          peer: {
            deviceId: PEER,
            publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'second', y: 'key' },
            peerEphemeralPublicJwk: { kty: 'EC', crv: 'P-256', x: 'e', y: 'f' },
            transcript: new Uint8Array([1, 2, 3]),
            verificationCode: '048213',
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

  it('reactivates a revoked device when it re-pairs with the key it always had', async () => {
    const now = Date.now();
    const key = { kty: 'EC', crv: 'P-256', x: 'first', y: 'key' };
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
    const peer = fakeSession();
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      keyTransfer: {
        peer: {
          deviceId: PEER,
          // The identity the record already vouches for, as a fresh export
          // carries it — extra members and all.
          publicIdentityJwk: { ...key, ext: true },
          peerEphemeralPublicJwk: { kty: 'EC', crv: 'P-256', x: 'e', y: 'f' },
          transcript: new Uint8Array([1, 2, 3]),
          verificationCode: '048213',
        },
        sessionPrivateKey: null,
        deviceId: asDeviceId('this-device'),
      },
    });

    // The digits were confirmed on both screens again: the removal is undone,
    // the key is untouched, and adoption went on to listen for the peer's
    // channels rather than staying dead.
    const record = await db.trustedDevices.get(String(PEER));
    expect(record?.status).toBe(TrustedDeviceStatus.Active);
    expect(record?.revokedAt).toBeUndefined();
    expect(record?.publicIdentityJwk).toEqual(key);
    expect(peer.listeningForChannels()).toBe(true);
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
      ring: await deriveKeyRing(generateMasterSecret(), 1),
      accountId: null,
    });
    // Raw capture: two protocols take turns on this channel, so one decoder
    // cannot read everything sent.
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
      removeEventListener: () => undefined,
    } as unknown as DataChannelLike;
    const peer = fakeSession(channel);
    const catchUp = createPeerCatchUp(db);

    await catchUp.adopt({
      session: peer.session,
      deviceId: PEER,
      keyTransfer: {
        peer: {
          deviceId: PEER,
          publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
          peerEphemeralPublicJwk: { kty: 'EC', crv: 'P-256', x: 'e', y: 'f' },
          transcript: new Uint8Array([9]),
          verificationCode: '048213',
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
