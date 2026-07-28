import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asDeviceId } from 'writer-sync/core';
import type { PeerSession } from 'writer-sync/providers/webrtc';
import type { DataChannelLike } from 'writer-sync/providers/webrtc';
import {
  decodeCatchUpMessage,
  type CatchUpMessage,
} from 'writer-sync/operations';
import { LoremDB } from '@/db/LoremDB';
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

/** A session whose channel arrives only when the test says so. */
const fakeSession = () => {
  const subscribers = new Set<(channel: DataChannelLike) => void>();
  const close = vi.fn();
  const session: PeerSession = {
    channel: () => null,
    onChannel: (listener) => {
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
      for (const listener of subscribers) listener(channel);
    },
  };
};

beforeEach(async () => {
  db = new LoremDB('peer-catch-up');
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

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
