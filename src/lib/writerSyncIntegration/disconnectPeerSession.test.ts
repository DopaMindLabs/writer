import { describe, expect, it } from 'vitest';
import { asDeviceId } from 'writer-sync/core';
import type { PeerLinkState, PeerSession } from 'writer-sync/providers/webrtc';
import { createPeerSessionRegistry } from './peerSessionRegistry';
import { disconnectPeerSession } from './disconnectPeerSession';

/**
 * Removing a device has to reach the connection it already has, not only the
 * record that decides the next one.
 */

const REMOVED = asDeviceId('device-removed');
const KEPT = asDeviceId('device-kept');

/** A session that records whether it was closed. */
const fakeSession = () => {
  let closed = false;
  const session = {
    channel: () => null,
    onChannel: () => () => undefined,
    onAnyChannel: () => () => undefined,
    openChannel: () => new Promise<never>(() => undefined),
    createOffer: () => Promise.resolve(''),
    acceptOffer: () => Promise.resolve(''),
    acceptAnswer: () => Promise.resolve(),
    linkState: (): PeerLinkState => 'connected',
    onLinkStateChange: () => () => undefined,
    close: () => {
      closed = true;
    },
  } as unknown as PeerSession;
  return Object.assign(session, { isClosed: () => closed });
};

describe('disconnectPeerSession', () => {
  it('closes the removed device’s session and forgets it', () => {
    const registry = createPeerSessionRegistry();
    const session = fakeSession();
    registry.add({ session, deviceId: REMOVED });

    disconnectPeerSession({ deviceId: REMOVED, registry });

    expect(session.isClosed()).toBe(true);
    expect(registry.peers()).toHaveLength(0);
  });

  it('leaves every other device connected', () => {
    const registry = createPeerSessionRegistry();
    const going = fakeSession();
    const staying = fakeSession();
    registry.add({ session: going, deviceId: REMOVED });
    registry.add({ session: staying, deviceId: KEPT });

    disconnectPeerSession({ deviceId: REMOVED, registry });

    expect(staying.isClosed()).toBe(false);
    expect(registry.peers().map((peer) => peer.deviceId)).toEqual([KEPT]);
  });

  it('does nothing when the device is not connected', () => {
    const registry = createPeerSessionRegistry();
    const session = fakeSession();
    registry.add({ session, deviceId: KEPT });

    expect(() => {
      disconnectPeerSession({ deviceId: REMOVED, registry });
    }).not.toThrow();
    expect(session.isClosed()).toBe(false);
  });
});
