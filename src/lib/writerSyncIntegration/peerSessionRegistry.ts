import type { DeviceId } from 'writer-sync/core';
import type { PeerSession } from 'writer-sync/providers/webrtc';

/**
 * The peer connections this device currently holds.
 *
 * A module of its own because two parts of the application need the same answer
 * from opposite directions: pairing *adds* a session once a human has confirmed
 * it, and the P2P provider *asks* for one when something wants a live transport.
 * Wiring them to each other directly would make the provider depend on the
 * pairing dialog's lifetime, which is precisely the coupling the catch-up holder
 * exists to avoid.
 *
 * Registration is not persistence: a session lives as long as the page does.
 * Nothing here survives a reload, and a later session between the same devices
 * is a fresh pairing exchange (`docs/pairing-protocol.md` §12).
 */

export interface RegisteredPeer {
  session: PeerSession;
  deviceId: DeviceId;
}

export interface PeerSessionRegistry {
  add: (peer: RegisteredPeer) => void;
  remove: (session: PeerSession) => void;
  peers: () => RegisteredPeer[];
  /**
   * The next peer to be registered, or the first already here.
   *
   * A promise rather than a poll because a provider may be asked for a transport
   * before any device has been paired — a document opened on a device that is
   * alone waits, rather than failing and never retrying.
   */
  next: () => Promise<RegisteredPeer>;
  clear: () => void;
}

export const createPeerSessionRegistry = (): PeerSessionRegistry => {
  const registered: RegisteredPeer[] = [];
  const waiting = new Set<(peer: RegisteredPeer) => void>();

  return {
    add: (peer) => {
      if (registered.some((known) => known.session === peer.session)) return;
      // A device has one live connection. Pairing again supersedes whatever was
      // registered for it, which is what lets the next frame reach a device that
      // was re-paired after its connection dropped — the stale session used to
      // stay, and stay first in line.
      const stale = registered.findIndex((known) => known.deviceId === peer.deviceId);
      if (stale >= 0) registered.splice(stale, 1);
      registered.push(peer);
      for (const resolve of [...waiting]) resolve(peer);
      waiting.clear();
    },
    remove: (session) => {
      const at = registered.findIndex((known) => known.session === session);
      if (at >= 0) registered.splice(at, 1);
    },
    peers: () => [...registered],
    next: () => {
      if (registered.length > 0) return Promise.resolve(registered[0]);
      return new Promise<RegisteredPeer>((resolve) => waiting.add(resolve));
    },
    clear: () => {
      registered.length = 0;
      waiting.clear();
    },
  };
};

/** The registry this application runs against. */
export const peerSessions = createPeerSessionRegistry();
