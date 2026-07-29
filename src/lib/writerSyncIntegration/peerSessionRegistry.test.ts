import { describe, expect, it } from 'vitest';
import { asDeviceId } from 'writer-sync/core';
import type { PeerSession } from 'writer-sync/providers/webrtc';
import { createPeerSessionRegistry } from './peerSessionRegistry';

/**
 * What pairing publishes and the P2P provider consumes.
 *
 * The two meet here rather than through each other: a provider that reached into
 * the pairing dialog would depend on its lifetime, which is the coupling the
 * catch-up holder exists to avoid.
 */

const fakeSession = (): PeerSession =>
  ({
    channel: () => null,
    onChannel: () => () => undefined,
    openChannel: () => new Promise<never>(() => undefined),
    createOffer: () => Promise.resolve(''),
    acceptOffer: () => Promise.resolve(''),
    acceptAnswer: () => Promise.resolve(),
    close: () => undefined,
  }) as unknown as PeerSession;

const peerOf = (session: PeerSession) => ({ session, deviceId: asDeviceId('peer-1') });

describe('createPeerSessionRegistry', () => {
  it('holds a session that has been paired', () => {
    const registry = createPeerSessionRegistry();
    const peer = peerOf(fakeSession());

    registry.add(peer);

    expect(registry.peers()).toEqual([peer]);
  });

  it('registers one session once, however often it is offered', () => {
    const registry = createPeerSessionRegistry();
    const peer = peerOf(fakeSession());

    registry.add(peer);
    registry.add(peer);

    expect(registry.peers()).toHaveLength(1);
  });

  it('resolves a waiting caller when a device is paired', async () => {
    const registry = createPeerSessionRegistry();
    const peer = peerOf(fakeSession());

    // A document opened before any pairing waits: rejecting would be a failure
    // nothing retries, on a device that is simply alone so far.
    const pending = registry.next();
    registry.add(peer);

    expect(await pending).toBe(peer);
  });

  it('answers at once when a device is already paired', async () => {
    const registry = createPeerSessionRegistry();
    const peer = peerOf(fakeSession());
    registry.add(peer);

    expect(await registry.next()).toBe(peer);
  });

  it('forgets a session that has been closed', () => {
    const registry = createPeerSessionRegistry();
    const session = fakeSession();
    registry.add(peerOf(session));

    registry.remove(session);

    expect(registry.peers()).toEqual([]);
  });

  it('replaces the session for a device that has paired again', async () => {
    // A device has one live connection. Pairing again after one dropped used to
    // leave the dead session registered and first in line, so every later frame
    // was offered a connection that was gone and the fresh pairing carried
    // nothing.
    const registry = createPeerSessionRegistry();
    const gone = peerOf(fakeSession());
    const fresh = peerOf(fakeSession());

    registry.add(gone);
    registry.add(fresh);

    expect(registry.peers()).toEqual([fresh]);
    expect(await registry.next()).toBe(fresh);
  });

  it('keeps the sessions of devices that are not each other', () => {
    const registry = createPeerSessionRegistry();
    const first = { session: fakeSession(), deviceId: asDeviceId('peer-1') };
    const second = { session: fakeSession(), deviceId: asDeviceId('peer-2') };

    registry.add(first);
    registry.add(second);

    expect(registry.peers()).toEqual([first, second]);
  });
});
