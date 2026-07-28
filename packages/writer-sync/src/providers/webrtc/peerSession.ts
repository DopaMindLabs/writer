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
  /**
   * A channel for one logical purpose, created here or awaited from the peer.
   *
   * The device that made the offer creates; the other waits. Both creating one
   * for the same purpose would leave each holding a channel the other never
   * reads, so the side that opens is decided by the exchange rather than by
   * whoever asks first.
   */
  openChannel: (label: string) => Promise<DataChannelLike>;
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
 * Holds the channels a session carries, by what each is for, and who is watching
 * for them.
 *
 * Separate from the session because a channel arrives by two different routes —
 * created here as the initiator, handed over by the peer as the answerer — and
 * both must land in the same place for `channel()` to mean the same thing on
 * either side.
 *
 * Keyed by label because one connection carries more than the control channel:
 * a live transport is made per scope and logical channel, and a registry that
 * kept only the first would drop every one of them. Within a label the first
 * still wins — a second channel for the same purpose must not displace one
 * already in use.
 */
const createChannelRegistry = () => {
  const listeners = new Map<string, Set<(channel: DataChannelLike) => void>>();
  const channels = new Map<string, DataChannelLike>();

  const watchers = (label: string): Set<(channel: DataChannelLike) => void> => {
    const existing = listeners.get(label);
    if (existing) return existing;
    const created = new Set<(channel: DataChannelLike) => void>();
    listeners.set(label, created);
    return created;
  };

  return {
    current: (label: string) => channels.get(label) ?? null,
    adopt: (channel: DataChannelLike): void => {
      if (channels.has(channel.label)) return;
      channels.set(channel.label, channel);
      for (const listener of watchers(channel.label)) listener(channel);
    },
    subscribe: (
      label: string,
      listener: (channel: DataChannelLike) => void,
    ): (() => void) => {
      watchers(label).add(listener);
      const existing = channels.get(label);
      if (existing) listener(existing);
      return () => {
        watchers(label).delete(listener);
      };
    },
    release: (): void => {
      listeners.clear();
      for (const channel of channels.values()) channel.close();
      channels.clear();
    },
  };
};

/**
 * The complete local description, once gathering has finished or run out of
 * time. A deadline reached is not itself a failure — only a description with no
 * candidate at all can never connect.
 */
const gatheredDescription = async (
  connection: PeerConnectionLike,
  options: Required<Pick<PeerSessionOptions, 'setTimer' | 'clearTimer'>> & {
    timeoutMillis: number;
  },
): Promise<string> => {
  const complete = await awaitGathering(connection, options);
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

interface OpenChannelOptions {
  label: string;
  channels: ReturnType<typeof createChannelRegistry>;
  connection: PeerConnectionLike;
  /** Whether this session made the offer, and so is the side that opens. */
  offered: () => boolean;
}

/**
 * The channel for one purpose: created here, or awaited from the peer.
 *
 * Only the device that made the offer creates. Both creating one for the same
 * purpose would leave each holding a channel the other never reads, so which
 * side opens follows from the exchange rather than from whoever asks first.
 */
const openChannelFor = ({
  label,
  channels,
  connection,
  offered,
}: OpenChannelOptions): Promise<DataChannelLike> =>
  new Promise((resolve) => {
    const existing = channels.current(label);
    if (existing !== null) {
      resolve(existing);
      return;
    }
    if (offered()) {
      channels.adopt(connection.createDataChannel(label, { ordered: true }));
      const created = channels.current(label);
      if (created !== null) resolve(created);
      return;
    }
    const unsubscribe = channels.subscribe(label, (channel) => {
      unsubscribe();
      resolve(channel);
    });
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
  const channels = createChannelRegistry();
  let closed = false;
  // Which half this session ran. The device that offered is the one that opens
  // channels; its peer takes what arrives.
  let offered = false;

  // Registered before any offer or answer, so a channel the peer opens the
  // instant the connection establishes is never missed.
  const offDataChannel = connection.onDataChannel(channels.adopt);

  const gathered = (): Promise<string> =>
    gatheredDescription(connection, { setTimer, clearTimer, timeoutMillis });

  const requireOpen = (): void => {
    if (closed) {
      throw new PairingError(PairingErrorCode.InvalidState, 'peer session is closed');
    }
  };

  return {
    channel: () => channels.current(CONTROL_CHANNEL),
    onChannel: (listener) => channels.subscribe(CONTROL_CHANNEL, listener),
    openChannel: (label) =>
      openChannelFor({ label, channels, connection, offered: () => offered }),
    createOffer: async () => {
      requireOpen();
      // Ordered and reliable: the operation protocol depends on a frame arriving
      // once and intact, not on best effort.
      offered = true;
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
