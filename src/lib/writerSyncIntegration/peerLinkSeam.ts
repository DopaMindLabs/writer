import { asDeviceId } from 'writer-sync/core';
import type { PeerLinkState, PeerSession } from 'writer-sync/providers/webrtc';
import { peerSessions } from './peerSessionRegistry';

/**
 * A way for an end-to-end run to make a peer link come up and go down.
 *
 * Only the browser event is faked. What it drives is the real registry, the real
 * link store and the real surfaces — which is the part worth proving, and the
 * part a mocked component test cannot reach. A genuine WebRTC drop takes minutes
 * of ICE re-checks to declare itself, so a suite that could only wait for one
 * would test the drop path once, slowly, and never in the states around it.
 *
 * Gated exactly like the other boot affordances (`db`, the fault switches), so
 * an ordinary production build never carries it.
 */

export interface PeerLinkSeam {
  /** Register a stand-in session for a device and report its link connecting. */
  connect: (deviceId: string) => void;
  /** Report the device's link interrupted, as a lost connection does. */
  drop: (deviceId: string) => void;
  /** Report it up again, as ICE re-checks succeeding would. */
  restore: (deviceId: string) => void;
}

/** A session that carries nothing: only its link state is ever asked for. */
const seamSession = (): PeerSession & { report: (state: PeerLinkState) => void } => {
  const listeners = new Set<(state: PeerLinkState) => void>();
  let state: PeerLinkState = 'connecting';
  return {
    channel: () => null,
    onChannel: () => () => undefined,
    openChannel: () => new Promise<never>(() => undefined),
    onAnyChannel: () => () => undefined,
    createOffer: () => Promise.resolve(''),
    acceptOffer: () => Promise.resolve(''),
    acceptAnswer: () => Promise.resolve(),
    linkState: () => state,
    onLinkStateChange: (listener) => {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    close: () => undefined,
    report: (next) => {
      state = next;
      for (const listener of [...listeners]) listener(next);
    },
  };
};

export const createPeerLinkSeam = (): PeerLinkSeam => {
  const sessions = new Map<string, ReturnType<typeof seamSession>>();

  const sessionFor = (deviceId: string): ReturnType<typeof seamSession> => {
    const existing = sessions.get(deviceId);
    if (existing) return existing;
    const created = seamSession();
    sessions.set(deviceId, created);
    peerSessions.add({ session: created, deviceId: asDeviceId(deviceId) });
    return created;
  };

  return {
    connect: (deviceId) => {
      sessionFor(deviceId).report('connected');
    },
    drop: (deviceId) => {
      sessionFor(deviceId).report('interrupted');
    },
    restore: (deviceId) => {
      sessionFor(deviceId).report('connected');
    },
  };
};

/** Put the seam on `window` where a spec can reach it, in dev and E2E builds only. */
export const installPeerLinkSeam = (): void => {
  if (!(import.meta.env.DEV || import.meta.env.VITE_E2E === '1')) return;
  (window as unknown as { peerLink: PeerLinkSeam }).peerLink = createPeerLinkSeam();
};
