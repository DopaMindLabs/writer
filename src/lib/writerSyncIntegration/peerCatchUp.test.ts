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
const fakeChannel = () => {
  const listeners = new Map<string, ((event: MessageEvent<unknown>) => void)[]>();
  const sent: CatchUpMessage[] = [];
  return {
    sent,
    /** Deliver a message as the peer, over the wire the transport listens on. */
    deliver: (message: CatchUpMessage) => {
      const event = {
        data: encodeCatchUpMessage(message),
      } as unknown as MessageEvent<unknown>;
      for (const listener of listeners.get('message') ?? []) listener(event);
    },
    channel: {
      readyState: 'open',
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
