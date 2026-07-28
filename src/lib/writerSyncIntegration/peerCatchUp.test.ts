import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asDeviceId } from 'writer-sync/core';
import type { PeerSession } from 'writer-sync/providers/webrtc';
import type { DataChannelLike } from 'writer-sync/providers/webrtc';
import {
  CATCH_UP_PROTOCOL_VERSION,
  decodeCatchUpMessage,
  encodeCatchUpMessage,
  type CatchUpMessage,
} from 'writer-sync/operations';
import { TrustedDeviceStatus } from 'writer-sync/core';
import { LoremDB } from '@/db/LoremDB';
import { NoteKind, NoteState } from '@/db/schema';
import { asOperationId, asPrincipalId } from 'writer-sync/core';
import { deriveKeyRing, generateMasterSecret } from '@/lib/cloud/crypto/keys';
import { forgetDeviceKeyRing, saveDeviceKeyRing } from '@/lib/cloud/crypto/keyStore';
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
      removeEventListener: () => undefined,
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

    catchUp.adopt({ session: peer.session, deviceId: PEER });
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

    catchUp.adopt({ session: peer.session, deviceId: PEER });

    await vi.waitFor(() => {
      expect(wire.sent).toEqual([{ v: 1, kind: 'manifest', manifests: [] }]);
    });
    catchUp.stop();
  });

  it('adopts a session once, however many times it is offered', async () => {
    const peer = fakeSession();
    const wire = fakeChannel();
    const catchUp = createPeerCatchUp(db);

    catchUp.adopt({ session: peer.session, deviceId: PEER });
    catchUp.adopt({ session: peer.session, deviceId: PEER });
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

    catchUp.adopt({ session: peer.session, deviceId: PEER });
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

    catchUp.adopt({ session: peer.session, deviceId: PEER });

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

    catchUp.adopt({
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

  it('closes every adopted session when it stops', () => {
    const first = fakeSession();
    const second = fakeSession();
    const catchUp = createPeerCatchUp(db);

    catchUp.adopt({ session: first.session, deviceId: PEER });
    catchUp.adopt({ session: second.session, deviceId: asDeviceId('other-device') });
    catchUp.stop();

    expect(first.close).toHaveBeenCalledTimes(1);
    expect(second.close).toHaveBeenCalledTimes(1);
  });

  it('asks for nothing while the device holds no key', async () => {
    const peer = fakeSession();
    const wire = fakeChannel();
    const catchUp = createPeerCatchUp(db);

    catchUp.adopt({ session: peer.session, deviceId: PEER });
    peer.openChannel(wire.channel);

    // A keyless device can decrypt no scope, so it advertises none rather than
    // collecting ciphertext it could never read.
    await vi.waitFor(() => {
      expect(wire.sent[0]).toEqual({ v: 1, kind: 'manifest', manifests: [] });
    });
    catchUp.stop();
  });
});
