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
 * Resolve once candidate gathering has finished.
 *
 * Waiting for *complete* gathering is what lets the whole description travel in
 * one QR payload: trickling candidates would mean repeated symbols, and every
 * extra scan is another chance for a user to accept a substituted payload.
 * A timeout surfaces as a typed local-connectivity failure rather than an
 * infinite "connecting" state.
 */
const awaitGathering = (
  connection: PeerConnectionLike,
  options: Required<Pick<PeerSessionOptions, 'setTimer' | 'clearTimer'>> & {
    timeoutMillis: number;
  },
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (connection.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    const settle = (outcome: () => void): void => {
      connection.removeEventListener('icegatheringstatechange', onChange);
      options.clearTimer(handle);
      outcome();
    };
    const onChange = (): void => {
      if (connection.iceGatheringState === 'complete') settle(resolve);
    };
    const handle = options.setTimer(() => {
      settle(() => {
        reject(
          new PairingError(
            PairingErrorCode.LocalConnectivity,
            'candidate gathering did not complete',
          ),
        );
      });
    }, options.timeoutMillis);
    connection.addEventListener('icegatheringstatechange', onChange);
  });

export const createPeerSession = (options: PeerSessionOptions): PeerSession => {
  const setTimer = options.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
  const clearTimer = options.clearTimer ?? ((handle) => {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  });
  const timeoutMillis = options.gatheringTimeoutMillis ?? ICE_GATHERING_TIMEOUT_MILLIS;

  // Created per session, never a provider-global singleton: two pairings must
  // not share a connection.
  const connection = options.createConnection();
  let channel: DataChannelLike | null = null;
  let closed = false;

  const gathered = async (): Promise<string> => {
    await awaitGathering(connection, { setTimer, clearTimer, timeoutMillis });
    const description = connection.localDescription;
    if (description === null) {
      throw new PairingError(
        PairingErrorCode.LocalConnectivity,
        'no local description after gathering',
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
    channel: () => channel,
    createOffer: async () => {
      requireOpen();
      // Ordered and reliable: the operation protocol depends on a frame arriving
      // once and intact, not on best effort.
      channel = connection.createDataChannel(CONTROL_CHANNEL, { ordered: true });
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
      channel?.close();
      channel = null;
      connection.close();
    },
  };
};
