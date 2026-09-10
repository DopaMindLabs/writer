import { PairingError, PairingErrorCode } from '../../pairing/pairing.types';
import { toPeerLinkState, type PeerLinkState } from './peerLinkState';
import type { DataChannelLike } from './webRtcTransport';

/**
 * WebRTC session orchestration behind the host-neutral
 * {@link PeerConnectionLike} contract. It gathers local candidates, exchanges
 * descriptions, manages labelled channels and reports link state.
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
  /** Observes channels opened by the remote peer and returns an unsubscribe. */
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
  /** Creates or awaits the channel for one logical purpose. */
  openChannel: (label: string) => Promise<DataChannelLike>;
  /** Observes every peer-opened channel, including channels already adopted. */
  onAnyChannel: (listener: (channel: DataChannelLike) => void) => () => void;
  /** Gather locally, then resolve the complete offer SDP. */
  createOffer: () => Promise<string>;
  /** Apply the peer's offer, gather locally, then resolve the answer SDP. */
  acceptOffer: (sdp: string) => Promise<string>;
  /** Apply the peer's answer. */
  acceptAnswer: (sdp: string) => Promise<void>;
  /** Whether this link is carrying anything, as {@link PeerLinkState} puts it. */
  linkState: () => PeerLinkState;
  /**
   * Observe the link state. Fires at once with the state as it stands, so a late
   * subscriber cannot miss a transition that has already happened — the same
   * contract {@link PeerSession.onChannel} keeps. Returns its own unsubscribe.
   */
  onLinkStateChange: (listener: (state: PeerLinkState) => void) => () => void;
  close: () => void;
}

/** What the control channel is called, so a host can tell it from the rest. */
export const CONTROL_CHANNEL = 'writer-sync-control';

/**
 * Waits for complete candidate gathering until the deadline. On timeout it
 * releases the candidates gathered so far and resolves `false`.
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
 * How many channels one peer may open on a session.
 *
 * A consumer starts a whole exchange per channel — each with its own inbound
 * allowance — so the count a peer controls is the count of exchanges it can
 * make this device run. Generous next to any real use (one channel per scope
 * and purpose) and far below what SCTP alone would permit.
 */
export const MAX_REMOTE_CHANNELS = 64;

/**
 * What the peer is allowed to open, and what it has open now.
 *
 * Its own unit because it answers a different question from the registry: the
 * registry knows which channel carries which purpose, this knows how much of
 * the session one peer may occupy. Only channels the peer opened are counted —
 * what this device opens, it is accountable for.
 */
const createRemoteChannelGate = (heldFor: (label: string) => DataChannelLike[]) => {
  const remote = new Set<DataChannelLike>();

  return {
    /**
     * Two bounds, because they answer different questions: the total is what
     * stops a session being multiplied, and the per-purpose one is what stops a
     * single purpose being multiplied. One remote channel per purpose is all
     * the simultaneous-open race can legitimately produce.
     */
    admits: (channel: DataChannelLike): boolean =>
      remote.size < MAX_REMOTE_CHANNELS &&
      !heldFor(channel.label).some((other) => remote.has(other)),
    took: (channel: DataChannelLike): void => {
      remote.add(channel);
    },
    forget: (channel: DataChannelLike): void => {
      remote.delete(channel);
    },
    clear: (): void => {
      remote.clear();
    },
  };
};

/** A callback taking a channel as it is adopted, or replayed on subscribe. */
type ChannelListener = (channel: DataChannelLike) => void;

/**
 * Who is waiting to hear about a channel — by purpose, or about any of them.
 *
 * Separate from the store because subscription is its own lifecycle: a listener
 * outlives the channel it was told about, and a channel outlives the listener
 * that unsubscribed.
 */
const createChannelListeners = (options: {
  heldFor: (label: string) => DataChannelLike[];
  all: () => DataChannelLike[];
}) => {
  const byLabel = new Map<string, Set<ChannelListener>>();
  const any = new Set<ChannelListener>();

  const watchers = (label: string): Set<ChannelListener> => {
    const existing = byLabel.get(label);
    if (existing) return existing;
    const created = new Set<ChannelListener>();
    byLabel.set(label, created);
    return created;
  };

  return {
    announce: (channel: DataChannelLike): void => {
      for (const listener of watchers(channel.label)) listener(channel);
      for (const listener of any) listener(channel);
    },
    subscribe: (label: string, listener: ChannelListener): (() => void) => {
      watchers(label).add(listener);
      const existing = options.heldFor(label).at(0);
      if (existing) listener(existing);
      return () => {
        watchers(label).delete(listener);
      };
    },
    subscribeAny: (listener: ChannelListener): (() => void) => {
      any.add(listener);
      for (const channel of options.all()) listener(channel);
      return () => {
        any.delete(listener);
      };
    },
    clear: (): void => {
      byLabel.clear();
      any.clear();
    },
  };
};

/** Stores locally and remotely opened channels by logical label. */
const createChannelRegistry = () => {
  const channels = new Map<string, DataChannelLike[]>();
  const heldFor = (label: string): DataChannelLike[] => channels.get(label) ?? [];
  const all = (): DataChannelLike[] => [...channels.values()].flat();
  const remote = createRemoteChannelGate(heldFor);
  const listeners = createChannelListeners({ heldFor, all });

  /** A channel that dies leaves, so the next request opens a live one. */
  const forgetOn = (channel: DataChannelLike): void => {
    const forget = (): void => {
      const remaining = heldFor(channel.label).filter((other) => other !== channel);
      if (remaining.length > 0) channels.set(channel.label, remaining);
      else channels.delete(channel.label);
      remote.forget(channel);
    };
    channel.addEventListener('close', forget);
    channel.addEventListener('error', forget);
  };

  const adopt = (channel: DataChannelLike): void => {
    const held = heldFor(channel.label);
    if (held.includes(channel)) return;
    // Kept alongside whatever is already here rather than instead of it. Both
    // devices may open one for the same purpose at the same moment, neither
    // having heard of the other's, and the one dropped would be the one the
    // peer is talking to. What this device *writes* to stays the first, so a
    // later arrival never moves the conversation out from under it.
    channels.set(channel.label, [...held, channel]);
    forgetOn(channel);
    listeners.announce(channel);
  };

  return {
    current: (label: string) => heldFor(label).at(0) ?? null,
    adopt,
    /**
     * Take a channel the peer opened, or refuse it. A refused channel is
     * closed rather than ignored: left open it would sit in the connection
     * costing the peer nothing and this device a buffer.
     */
    adoptRemote: (channel: DataChannelLike): void => {
      if (!remote.admits(channel)) {
        channel.close();
        return;
      }
      remote.took(channel);
      adopt(channel);
    },
    subscribeAny: listeners.subscribeAny,
    subscribe: listeners.subscribe,
    release: (): void => {
      listeners.clear();
      remote.clear();
      for (const channel of all()) channel.close();
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

/**
 * The link's state, and whoever is watching it.
 *
 * Kept here rather than left to the caller because the connection itself is
 * never handed out: a host that had to subscribe to `connectionstatechange`
 * would need the raw `RTCPeerConnection` back, which is the very thing this
 * session exists to keep to itself.
 *
 * Repeats are suppressed, so a listener hears transitions rather than events —
 * ICE re-checks can report the same state twice, and a caller acting on "the
 * link dropped" must not act twice on one drop.
 */
const createLinkWatch = (connection: PeerConnectionLike) => {
  const listeners = new Set<(state: PeerLinkState) => void>();
  let state = toPeerLinkState(connection.connectionState);

  const publish = (next: PeerLinkState): void => {
    if (next === state) return;
    state = next;
    for (const listener of [...listeners]) listener(next);
  };

  const onChange = (): void => {
    publish(toPeerLinkState(connection.connectionState));
  };
  connection.addEventListener('connectionstatechange', onChange);

  return {
    current: (): PeerLinkState => state,
    subscribe: (listener: (state: PeerLinkState) => void): (() => void) => {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    /**
     * Say the link is closed, once, on the way down. A browser need not fire
     * `connectionstatechange` for a close this side asked for, so the event is
     * released first and the state announced by hand — otherwise a watcher would
     * be left holding `connected` for a session that no longer exists.
     */
    release: (): void => {
      connection.removeEventListener('connectionstatechange', onChange);
      publish('closed');
      listeners.clear();
    },
  };
};

/** Timers and deadline, defaulted once so the session body stays about sessions. */
const resolveTimers = (options: PeerSessionOptions) => ({
  setTimer: options.setTimer ?? ((callback: () => void, millis: number) => setTimeout(callback, millis)),
  clearTimer:
    options.clearTimer ??
    ((handle: unknown) => {
      clearTimeout(handle as ReturnType<typeof setTimeout>);
    }),
  timeoutMillis: options.gatheringTimeoutMillis ?? ICE_GATHERING_TIMEOUT_MILLIS,
});

interface OpenChannelOptions {
  label: string;
  channels: ReturnType<typeof createChannelRegistry>;
  connection: PeerConnectionLike;
}

/**
 * The channel for one purpose: whichever end has something to carry opens one.
 *
 * Either device may, because either may be the one being written on. Waiting for
 * the peer instead is waiting for it to guess: it has no reason to open a channel
 * for a scope it has never heard of, so a device that could only wait had no way
 * to send its own work at all, and the pair drifted apart while appearing to
 * sync. Both ends opening one for the same purpose is the ordinary case, not a
 * collision — each writes to the one it opened and reads whatever arrives.
 */
const openChannelFor = ({
  label,
  channels,
  connection,
}: OpenChannelOptions): Promise<DataChannelLike> =>
  new Promise((resolve) => {
    const existing = channels.current(label);
    if (existing !== null) {
      resolve(existing);
      return;
    }
    channels.adopt(connection.createDataChannel(label, { ordered: true }));
    const created = channels.current(label);
    if (created !== null) {
      resolve(created);
      return;
    }
    const unsubscribe = channels.subscribe(label, (channel) => {
      unsubscribe();
      resolve(channel);
    });
  });

export const createPeerSession = (options: PeerSessionOptions): PeerSession => {
  const timers = resolveTimers(options);

  // Created per session, never a provider-global singleton: two pairings must
  // not share a connection.
  const connection = options.createConnection();
  const channels = createChannelRegistry();
  let closed = false;

  // Registered before any offer or answer, so a channel the peer opens the
  // instant the connection establishes is never missed — and so is the link
  // state, which can reach `connected` before anything asks about it.
  const offDataChannel = connection.onDataChannel(channels.adoptRemote);
  const link = createLinkWatch(connection);

  const gathered = (): Promise<string> => gatheredDescription(connection, timers);

  const requireOpen = (): void => {
    if (closed) {
      throw new PairingError(PairingErrorCode.InvalidState, 'peer session is closed');
    }
  };

  return {
    channel: () => channels.current(CONTROL_CHANNEL),
    onChannel: (listener) => channels.subscribe(CONTROL_CHANNEL, listener),
    openChannel: (label) =>
      openChannelFor({ label, channels, connection }),
    onAnyChannel: (listener) => channels.subscribeAny(listener),
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
    linkState: link.current,
    onLinkStateChange: link.subscribe,
    close: () => {
      if (closed) return;
      closed = true;
      // Before the teardown, so a watcher hears `closed` from a session that
      // still exists rather than inferring it from silence.
      link.release();
      offDataChannel();
      channels.release();
      connection.close();
    },
  };
};
