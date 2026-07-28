import { PairingError, PairingErrorCode } from '../../pairing/pairing.types';
import type { DataChannelLike } from './webRtcTransport';

/**
 * The WebRTC peer session, per runbook §22.
 *
 * Everything the browser provides sits behind {@link PeerConnectionLike} and a
 * factory, so this module is testable without WebRTC and a native host can
 * substitute its own implementation. That is also the honest limitation: mocked
 * tests prove the *orchestration* — gathering completes before the description
 * is handed out, timeouts are typed, teardown is explicit — and prove nothing
 * about real ICE. Real-device verification is slice 2A.9 and is not discharged
 * here.
 */

/** Stage 2A is local-only: no STUN, no TURN, no silent fallback to a public server. */
export const LOCAL_ONLY_ICE_CONFIGURATION: { iceServers: readonly never[] } = {
  iceServers: [],
};

/** How long to wait for local candidate gathering before giving up. */
export const ICE_GATHERING_TIMEOUT_MILLIS = 10_000;

export interface SessionDescriptionLike {
  type: string;
  sdp: string;
}

/** The subset of `RTCPeerConnection` a pairing session needs. */
export interface PeerConnectionLike {
  readonly iceGatheringState: string;
  readonly connectionState: string;
  localDescription: SessionDescriptionLike | null;
  createDataChannel: (label: string, options?: { ordered?: boolean }) => DataChannelLike;
  createOffer: () => Promise<SessionDescriptionLike>;
  createAnswer: () => Promise<SessionDescriptionLike>;
  setLocalDescription: (description: SessionDescriptionLike) => Promise<void>;
  setRemoteDescription: (description: SessionDescriptionLike) => Promise<void>;
  close: () => void;
  /**
   * Observe the channel the *remote* peer opened. The answering side never calls
   * `createDataChannel`, so this is its only way to obtain one; without it a
   * paired device could complete the exchange and still have nothing to sync
   * over. Returns its own unsubscribe.
   */
  onDataChannel: (listener: (channel: DataChannelLike) => void) => () => void;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

export interface PeerSessionOptions {
  createConnection: () => PeerConnectionLike;
  /** Injected so tests need no real clock. */
  setTimer?: (callback: () => void, millis: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  gatheringTimeoutMillis?: number;
}

export interface PeerSession {
  /** The control channel; ordered and reliable, created by the initiator. */
  channel: () => DataChannelLike | null;
  /**
   * Observe the control channel however this side came by it — created here as
   * the initiator, or opened by the peer as the answerer. Fires at once when one
   * already exists, so a late subscriber cannot miss it. Returns its own
   * unsubscribe.
   */
  onChannel: (listener: (channel: DataChannelLike) => void) => () => void;
  /** Gather locally, then resolve the complete offer SDP. */
  createOffer: () => Promise<string>;
  /** Apply the peer's offer, gather locally, then resolve the answer SDP. */
  acceptOffer: (sdp: string) => Promise<string>;
  /** Apply the peer's answer. */
  acceptAnswer: (sdp: string) => Promise<void>;
  close: () => void;
}

const CONTROL_CHANNEL = 'writer-sync-control';

/**
 * Wait for candidate gathering to finish, or for the deadline to pass.
 *
 * Waiting for *complete* gathering is what lets the whole description travel in
 * one QR payload: trickling candidates would mean repeated symbols, and every
 * extra scan is another chance for a user to accept a substituted payload.
 *
 * The deadline is not a failure on its own. Gathering stalls on hosts where
 * Chromium's mDNS responder cannot bind, long after the host candidates a LAN
 * pair actually needs are already in the description — so the deadline releases
 * what has been gathered and leaves it to the caller to judge whether that is
 * enough. It resolves `false` to say so.
 */
const awaitGathering = (
  connection: PeerConnectionLike,
  options: Required<Pick<PeerSessionOptions, 'setTimer' | 'clearTimer'>> & {
    timeoutMillis: number;
  },
): Promise<boolean> =>
  new Promise((resolve) => {
    if (connection.iceGatheringState === 'complete') {
      resolve(true);
      return;
    }
    const settle = (complete: boolean): void => {
      connection.removeEventListener('icegatheringstatechange', onChange);
      options.clearTimer(handle);
      resolve(complete);
    };
    const onChange = (): void => {
      if (connection.iceGatheringState === 'complete') settle(true);
    };
    const handle = options.setTimer(() => {
      settle(false);
    }, options.timeoutMillis);
    connection.addEventListener('icegatheringstatechange', onChange);
  });

/** An SDP with no candidate of its own can never connect, however it was produced. */
const hasCandidate = (sdp: string): boolean => sdp.includes('a=candidate');

/**
 * Holds the one control channel a session carries and who is watching for it.
 *
 * Separate from the session because the channel arrives by two different routes
 * — created here as the initiator, handed over by the peer as the answerer — and
 * both must land in the same place for `channel()` to mean the same thing on
 * either side.
 */
const createChannelRegistry = () => {
  const listeners = new Set<(channel: DataChannelLike) => void>();
  let current: DataChannelLike | null = null;

  return {
    current: () => current,
    /** First one wins: a second channel must not displace one already in use. */
    adopt: (channel: DataChannelLike): void => {
      if (current !== null) return;
      current = channel;
      for (const listener of listeners) listener(channel);
    },
    subscribe: (listener: (channel: DataChannelLike) => void): (() => void) => {
      listeners.add(listener);
      if (current !== null) listener(current);
      return () => {
        listeners.delete(listener);
      };
    },
    release: (): void => {
      listeners.clear();
      current?.close();
      current = null;
    },
  };
};

export const createPeerSession = (options: PeerSessionOptions): PeerSession => {
  const setTimer = options.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
  const clearTimer = options.clearTimer ?? ((handle) => {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  });
  const timeoutMillis = options.gatheringTimeoutMillis ?? ICE_GATHERING_TIMEOUT_MILLIS;

  // Created per session, never a provider-global singleton: two pairings must
  // not share a connection.
  const connection = options.createConnection();
  const channels = createChannelRegistry();
  let closed = false;

  // Registered before any offer or answer, so a channel the peer opens the
  // instant the connection establishes is never missed.
  const offDataChannel = connection.onDataChannel(channels.adopt);

  const gathered = async (): Promise<string> => {
    const complete = await awaitGathering(connection, { setTimer, clearTimer, timeoutMillis });
    const description = connection.localDescription;
    if (description === null) {
      throw new PairingError(
        PairingErrorCode.LocalConnectivity,
        'no local description after gathering',
      );
    }
    if (!complete && !hasCandidate(description.sdp)) {
      throw new PairingError(
        PairingErrorCode.LocalConnectivity,
        'candidate gathering stalled before any candidate was found',
      );
    }
    return description.sdp;
  };

  const requireOpen = (): void => {
    if (closed) {
      throw new PairingError(PairingErrorCode.InvalidState, 'peer session is closed');
    }
  };

  return {
    channel: channels.current,
    onChannel: channels.subscribe,
    createOffer: async () => {
      requireOpen();
      // Ordered and reliable: the operation protocol depends on a frame arriving
      // once and intact, not on best effort.
      channels.adopt(connection.createDataChannel(CONTROL_CHANNEL, { ordered: true }));
      await connection.setLocalDescription(await connection.createOffer());
      return gathered();
    },
    acceptOffer: async (sdp) => {
      requireOpen();
      await connection.setRemoteDescription({ type: 'offer', sdp });
      await connection.setLocalDescription(await connection.createAnswer());
      return gathered();
    },
    acceptAnswer: async (sdp) => {
      requireOpen();
      await connection.setRemoteDescription({ type: 'answer', sdp });
    },
    close: () => {
      if (closed) return;
      closed = true;
      offDataChannel();
      channels.release();
      connection.close();
    },
  };
};
