import { describe, expect, it } from 'vitest';
import { asDeviceId } from 'writer-sync/core';
import type { PeerLinkState, PeerSession } from 'writer-sync/providers/webrtc';
import { createPeerSessionRegistry } from './peerSessionRegistry';

/**
 * What pairing publishes and the P2P provider consumes.
 *
 * The two meet here rather than through each other: a provider that reached into
 * the pairing dialog would depend on its lifetime, which is the coupling the
 * catch-up holder exists to avoid.
 */

/** A session whose link state a test can drive, and whose close it records. */
const fakeSession = () => {
  const listeners = new Set<(state: PeerLinkState) => void>();
  let state: PeerLinkState = 'connecting';
  let closed = false;
  const session = {
    channel: () => null,
    onChannel: () => () => undefined,
    openChannel: () => new Promise<never>(() => undefined),
    createOffer: () => Promise.resolve(''),
    acceptOffer: () => Promise.resolve(''),
    acceptAnswer: () => Promise.resolve(),
    linkState: () => state,
    onLinkStateChange: (listener: (state: PeerLinkState) => void) => {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    close: () => {
      closed = true;
    },
  } as unknown as PeerSession;
  return Object.assign(session, {
    enters: (next: PeerLinkState) => {
      state = next;
      for (const listener of [...listeners]) listener(next);
    },
    isClosed: () => closed,
    watcherCount: () => listeners.size,
  });
};

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

describe('the link state a registered session reports', () => {
  it('reaches the observer it was given, per device', () => {
    const seen: [string, PeerLinkState][] = [];
    const registry = createPeerSessionRegistry({
      onLinkState: (deviceId, state) => seen.push([String(deviceId), state]),
    });
    const session = fakeSession();

    registry.add(peerOf(session));
    session.enters('connected');

    expect(seen).toEqual([
      ['peer-1', 'connecting'],
      ['peer-1', 'connected'],
    ]);
  });

  it('forgets a session whose link has closed for good', () => {
    // A registry that kept it would go on handing out a corpse: every later
    // frame offered a connection that no longer exists.
    const registry = createPeerSessionRegistry();
    const session = fakeSession();
    registry.add(peerOf(session));

    session.enters('closed');

    expect(registry.peers()).toEqual([]);
  });

  it('keeps a session whose link is merely interrupted', () => {
    // ICE re-checks can bring one back on their own; dropping it here would
    // throw away a link that is about to work again.
    const registry = createPeerSessionRegistry();
    const session = fakeSession();
    registry.add(peerOf(session));

    session.enters('connected');
    session.enters('interrupted');

    expect(registry.peers()).toHaveLength(1);
  });

  it('stops listening to a session it has let go of', () => {
    const registry = createPeerSessionRegistry();
    const session = fakeSession();
    registry.add(peerOf(session));

    registry.remove(session);

    expect(session.watcherCount()).toBe(0);
  });

  it('says nothing more about a device whose superseded session dies', () => {
    // The ordering that matters: a re-pairing supersedes a session which is then
    // closed, and a report from the dead one would announce a drop for a device
    // that is at that moment freshly connected.
    const seen: [string, PeerLinkState][] = [];
    const registry = createPeerSessionRegistry({
      onLinkState: (deviceId, state) => seen.push([String(deviceId), state]),
    });
    const gone = fakeSession();
    const fresh = fakeSession();
    registry.add(peerOf(gone));
    gone.enters('connected');
    seen.length = 0;

    registry.add(peerOf(fresh));
    fresh.enters('connected');

    expect(gone.isClosed()).toBe(true);
    expect(seen).toEqual([
      ['peer-1', 'connecting'],
      ['peer-1', 'connected'],
    ]);
  });

  it('lets go of every session it holds when cleared', () => {
    const registry = createPeerSessionRegistry();
    const session = fakeSession();
    registry.add(peerOf(session));

    registry.clear();

    expect(session.watcherCount()).toBe(0);
    expect(registry.peers()).toEqual([]);
  });
});
