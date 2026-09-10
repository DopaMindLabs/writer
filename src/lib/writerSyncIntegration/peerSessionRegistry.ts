import type { DeviceId } from 'writer-sync/core';
import type { PeerLinkState, PeerSession } from 'writer-sync/providers/webrtc';
import { peerLinkStatus } from './peerLinkStatus';

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

export interface PeerSessionRegistryOptions {
  /**
   * Told what each registered session reports about its link, per device.
   *
   * Injected rather than imported so this stays a registry: what a link state
   * *means* to a person — a connected device, a device that dropped — belongs to
   * whatever is showing it, not to the thing holding sessions.
   */
  onLinkState?: (deviceId: DeviceId, state: PeerLinkState) => void;
}

export const createPeerSessionRegistry = (
  options: PeerSessionRegistryOptions = {},
): PeerSessionRegistry => {
  const registered: RegisteredPeer[] = [];
  const waiting = new Set<(peer: RegisteredPeer) => void>();
  /** Kept here rather than on `RegisteredPeer`, which is the published shape. */
  const watching = new Map<PeerSession, () => void>();

  const forget = (session: PeerSession): void => {
    watching.get(session)?.();
    watching.delete(session);
    const at = registered.findIndex((known) => known.session === session);
    if (at >= 0) registered.splice(at, 1);
  };

  const watch = (peer: RegisteredPeer): void => {
    watching.set(
      peer.session,
      peer.session.onLinkStateChange((state) => {
        options.onLinkState?.(peer.deviceId, state);
        // Closed is the one state nothing recovers from: a session that reports
        // it will never carry anything again, and holding it would keep offering
        // a connection that no longer exists.
        if (state === 'closed') forget(peer.session);
      }),
    );
  };

  return {
    add: (peer) => {
      if (registered.some((known) => known.session === peer.session)) return;
      // A device has one live connection. Pairing again supersedes whatever was
      // registered for it, which is what lets the next frame reach a device that
      // was re-paired after its connection dropped — the stale session used to
      // stay, and stay first in line.
      //
      // The order is load-bearing. The stale session is let go of *before* the
      // fresh one is watched and closed only afterwards, so its own teardown
      // cannot report a lost link for a device that is at that moment freshly
      // connected.
      const stale = registered.find((known) => known.deviceId === peer.deviceId);
      if (stale) forget(stale.session);
      registered.push(peer);
      watch(peer);
      for (const resolve of [...waiting]) resolve(peer);
      waiting.clear();
      stale?.session.close();
    },
    remove: forget,
    peers: () => [...registered],
    next: () => {
      if (registered.length > 0) return Promise.resolve(registered[0]);
      return new Promise<RegisteredPeer>((resolve) => waiting.add(resolve));
    },
    clear: () => {
      for (const unsubscribe of watching.values()) unsubscribe();
      watching.clear();
      registered.length = 0;
      waiting.clear();
    },
  };
};

/**
 * The registry this application runs against, reporting what it sees to the
 * page-lifetime link store the device list and the drop notice read.
 */
export const peerSessions = createPeerSessionRegistry({
  onLinkState: peerLinkStatus.observe,
});
