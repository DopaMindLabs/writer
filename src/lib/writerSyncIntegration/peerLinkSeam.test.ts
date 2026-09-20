import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { peerLinkStatus } from './peerLinkStatus';
import { peerSessions } from './peerSessionRegistry';
import { createPeerLinkSeam, installPeerLinkSeam } from './peerLinkSeam';

/**
 * The seam an end-to-end run drives. It must go through the real registry and
 * the real store — a seam that wrote to the store directly would prove the UI
 * renders a value, not that a link state travels the path it does in production.
 */

const PEER = 'peer-1';

beforeEach(() => {
  peerSessions.clear();
  peerLinkStatus.reset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete (window as unknown as { peerLink?: unknown }).peerLink;
});

describe('createPeerLinkSeam', () => {
  it('registers a session with the registry the provider reads', () => {
    createPeerLinkSeam().connect(PEER);

    expect(peerSessions.peers()).toHaveLength(1);
    expect(peerLinkStatus.current()).toEqual({ [PEER]: 'connected' });
  });

  it('reports a drop by the same route a real one takes', () => {
    const seam = createPeerLinkSeam();
    seam.connect(PEER);

    seam.drop(PEER);

    expect(peerLinkStatus.current()).toEqual({ [PEER]: 'dropped' });
    expect(peerLinkStatus.dropped()).toBe(true);
  });

  it('keeps one session per device, however often it is driven', () => {
    const seam = createPeerLinkSeam();

    seam.connect(PEER);
    seam.drop(PEER);
    seam.restore(PEER);

    expect(peerSessions.peers()).toHaveLength(1);
    expect(peerLinkStatus.current()).toEqual({ [PEER]: 'connected' });
  });

  it('drops nothing that was never connected', () => {
    // The same rule the store keeps: a link that never worked has not been lost.
    createPeerLinkSeam().drop(PEER);

    expect(peerLinkStatus.dropped()).toBe(false);
  });

  it('stands in for a session completely enough to be registered as one', async () => {
    // The registry takes a `PeerSession`, and a consumer may ask any part of one
    // of whatever it holds. A stub that answered only the parts this seam drives
    // would throw the first time something read the rest.
    const seam = createPeerLinkSeam();
    seam.connect(PEER);
    const { session } = peerSessions.peers()[0];

    expect(session.linkState()).toBe('connected');
    expect(session.channel()).toBeNull();
    expect(() => {
      session.onChannel(() => undefined)();
      session.onAnyChannel(() => undefined)();
      session.close();
    }).not.toThrow();
    await expect(session.createOffer()).resolves.toBe('');
    await expect(session.acceptOffer('')).resolves.toBe('');
    await expect(session.acceptAnswer('')).resolves.toBeUndefined();
  });
});

describe('installPeerLinkSeam', () => {
  it('puts the seam where a spec can reach it in a development build', () => {
    installPeerLinkSeam();

    expect((window as unknown as { peerLink?: unknown }).peerLink).toBeDefined();
  });

  it('leaves an ordinary production build carrying nothing', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_E2E', '');

    installPeerLinkSeam();

    expect((window as unknown as { peerLink?: unknown }).peerLink).toBeUndefined();
  });
});
