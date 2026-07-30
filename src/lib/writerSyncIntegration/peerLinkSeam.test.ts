import { beforeEach, describe, expect, it } from 'vitest';
import { peerLinkStatus } from './peerLinkStatus';
import { peerSessions } from './peerSessionRegistry';
import { createPeerLinkSeam } from './peerLinkSeam';

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
});
