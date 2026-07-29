import { describe, expect, it, vi } from 'vitest';
import { PairingError, PairingErrorCode } from '../../pairing/pairing.types';
import {
  LOCAL_ONLY_ICE_CONFIGURATION,
  createPeerSession,
  type PeerConnectionLike,
  type SessionDescriptionLike,
} from './peerSession';
import type { DataChannelLike } from './webRtcTransport';

/**
 * A scriptable stand-in for `RTCPeerConnection`. These tests prove the
 * orchestration — that gathering completes before a description is handed out,
 * that a stall is a typed failure, that teardown is explicit. They prove nothing
 * about real ICE; that is slice 2A.9.
 */
/** A channel that can report itself gone, the way a real one does. */
const fakeDataChannel = (label: string) => {
  const listeners = new Map<string, ((event: MessageEvent<unknown>) => void)[]>();
  const channel = {
    label,
    readyState: 'connecting',
    bufferedAmount: 0,
    bufferedAmountLowThreshold: 0,
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((held) => held !== listener),
      );
    },
    die: () => {
      (channel as { readyState: string }).readyState = 'closed';
      for (const listener of [...(listeners.get('close') ?? [])]) {
        listener({} as MessageEvent<unknown>);
      }
    },
  };
  return channel as unknown as DataChannelLike & { die: () => void };
};

const fakeConnection = (
  options: { gatheringCompletesImmediately?: boolean; offerSdp?: string } = {},
) => {
  const offerSdp = options.offerSdp ?? 'v=0\r\nOFFER\r\n';
  const listeners = new Map<string, (() => void)[]>();
  const channels: string[] = [];
  /** The channels this connection created, so a test can play one dying. */
  const opened: (DataChannelLike & { die: () => void })[] = [];
  const remoteChannelListeners = new Set<(channel: DataChannelLike) => void>();
  const connection: PeerConnectionLike & {
    channels: string[];
    finishGathering: () => void;
    remote: SessionDescriptionLike | null;
    closed: boolean;
    channelOrdered: boolean | undefined;
    /** Stand in for the peer opening a channel on this connection. */
    peerOpensChannel: (channel: DataChannelLike) => void;
    remoteChannelListenerCount: () => number;
    opened: (DataChannelLike & { die: () => void })[];
  } = {
    opened,
    onDataChannel: (listener) => {
      remoteChannelListeners.add(listener);
      return () => {
        remoteChannelListeners.delete(listener);
      };
    },
    peerOpensChannel: (channel) => {
      for (const listener of remoteChannelListeners) listener(channel);
    },
    remoteChannelListenerCount: () => remoteChannelListeners.size,
    iceGatheringState: options.gatheringCompletesImmediately === true ? 'complete' : 'gathering',
    connectionState: 'new',
    localDescription: null,
    remote: null,
    closed: false,
    channels,
    channelOrdered: undefined,
    createDataChannel: (label, opts) => {
      channels.push(label);
      connection.channelOrdered = opts?.ordered;
      const channel = fakeDataChannel(label);
      opened.push(channel);
      return channel;
    },
    createOffer: () => Promise.resolve({ type: 'offer', sdp: offerSdp }),
    createAnswer: () => Promise.resolve({ type: 'answer', sdp: 'v=0\r\nANSWER\r\n' }),
    setLocalDescription: (description) => {
      connection.localDescription = description;
      return Promise.resolve();
    },
    setRemoteDescription: (description) => {
      connection.remote = description;
      return Promise.resolve();
    },
    close: () => {
      connection.closed = true;
    },
    addEventListener: (type, listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener: (type, listener) => {
      listeners.set(type, (listeners.get(type) ?? []).filter((l) => l !== listener));
    },
    finishGathering: () => {
      (connection as { iceGatheringState: string }).iceGatheringState = 'complete';
      for (const listener of listeners.get('icegatheringstatechange') ?? []) listener();
    },
  };
  return Object.assign(connection, {
    listenerCount: (type: string) => (listeners.get(type) ?? []).length,
  });
};

/** A timer the test fires by hand, so nothing waits on the wall clock. */
const manualTimers = () => {
  const fired: (() => void)[] = [];
  return {
    setTimer: (callback: () => void) => {
      fired.push(callback);
      return fired.length - 1;
    },
    clearTimer: () => undefined,
    count: () => fired.length,
    fireAll: () => {
      for (const callback of [...fired]) callback();
    },
  };
};

/**
 * Wait until the session has actually reached its gathering wait. `createOffer`
 * awaits two promises before it registers anything, so firing a timer or an
 * event straight after calling it lands on nothing and the test hangs.
 */
const untilWaiting = async (registered: () => boolean): Promise<void> => {
  await vi.waitFor(() => {
    expect(registered()).toBe(true);
  });
};

describe('local-only configuration', () => {
  it('contacts no STUN or TURN server', () => {
    // Stage 2A must never silently reach a third party for connectivity.
    expect(LOCAL_ONLY_ICE_CONFIGURATION.iceServers).toEqual([]);
  });
});

describe('createOffer', () => {
  it('resolves the complete description only after gathering finishes', async () => {
    const connection = fakeConnection();
    const timers = manualTimers();
    const session = createPeerSession({ createConnection: () => connection, ...timers });

    const pending = session.createOffer();
    let settled = false;
    void pending.then(() => (settled = true));
    await untilWaiting(() => connection.listenerCount('icegatheringstatechange') > 0);
    // Still gathering: a partial description must not travel in a QR payload.
    expect(settled).toBe(false);

    connection.finishGathering();
    expect(await pending).toBe('v=0\r\nOFFER\r\n');
  });

  it('resolves immediately when gathering is already complete', async () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection, ...manualTimers() });
    expect(await session.createOffer()).toBe('v=0\r\nOFFER\r\n');
  });

  it('opens an ordered, reliable control channel', async () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection, ...manualTimers() });
    await session.createOffer();
    expect(connection.channels).toEqual(['writer-sync-control']);
    expect(connection.channelOrdered).toBe(true);
    expect(session.channel()).not.toBeNull();
  });

  it('lets go of a channel that has closed, and opens a new one when asked again', async () => {
    // A channel that dies used to stay in the session, so every later request for
    // that purpose was answered with the dead one — which is why re-pairing did
    // not restore live sync on a connection that had dropped.
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection, ...manualTimers() });
    await session.createOffer();
    expect(session.channel()).not.toBeNull();

    connection.opened[0].die();

    expect(session.channel()).toBeNull();
    await session.openChannel('writer-sync-control');
    expect(connection.channels).toEqual(['writer-sync-control', 'writer-sync-control']);
  });

  it('hands out what was gathered when the deadline passes mid-gathering', async () => {
    // Chromium registers an mDNS hostname for each host candidate, and on a host
    // where that responder cannot bind, gathering never reports complete even
    // though usable candidates are already in the description. Refusing to pair
    // there would be refusing over a formality: a LAN pair needs host candidates
    // and nothing more.
    const connection = fakeConnection({
      offerSdp: 'v=0\r\nOFFER\r\na=candidate:1 1 udp 1 10.0.0.2 4000 typ host\r\n',
    });
    const timers = manualTimers();
    const session = createPeerSession({ createConnection: () => connection, ...timers });

    const pending = session.createOffer();
    await untilWaiting(() => timers.count() > 0);
    timers.fireAll();

    expect(await pending).toContain('a=candidate');
    // The connection is still gathering — the deadline released the description,
    // it did not end the gathering.
    expect(connection.iceGatheringState).toBe('gathering');
  });

  it('reports a stall with nothing gathered as a typed local-connectivity failure', async () => {
    // Not an infinite "connecting" state, and not a candidate-free description
    // that could only ever fail to connect.
    const connection = fakeConnection();
    const timers = manualTimers();
    const session = createPeerSession({ createConnection: () => connection, ...timers });
    const pending = session.createOffer();
    await untilWaiting(() => timers.count() > 0);
    timers.fireAll();
    await expect(pending).rejects.toBeInstanceOf(PairingError);
    await pending.catch((error: unknown) => {
      expect((error as PairingError).code).toBe(PairingErrorCode.LocalConnectivity);
    });
  });
});

describe('acceptOffer', () => {
  it('applies the peer description and answers with a gathered description', async () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection, ...manualTimers() });
    expect(await session.acceptOffer('v=0\r\nTHEIRS\r\n')).toBe('v=0\r\nANSWER\r\n');
    expect(connection.remote).toEqual({ type: 'offer', sdp: 'v=0\r\nTHEIRS\r\n' });
  });

  it('does not open a second control channel — the initiator owns it', async () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection, ...manualTimers() });
    await session.acceptOffer('v=0\r\nTHEIRS\r\n');
    expect(connection.channels).toEqual([]);
  });
});

describe('acceptAnswer', () => {
  it('applies the peer answer', async () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection, ...manualTimers() });
    await session.acceptAnswer('v=0\r\nTHEIR-ANSWER\r\n');
    expect(connection.remote).toEqual({ type: 'answer', sdp: 'v=0\r\nTHEIR-ANSWER\r\n' });
  });
});

describe('close', () => {
  it('tears down the connection explicitly', () => {
    const connection = fakeConnection();
    const session = createPeerSession({ createConnection: () => connection, ...manualTimers() });
    session.close();
    expect(connection.closed).toBe(true);
  });

  it('is idempotent', () => {
    const connection = fakeConnection();
    const session = createPeerSession({ createConnection: () => connection, ...manualTimers() });
    session.close();
    expect(() => session.close()).not.toThrow();
  });

  it('refuses further work once closed', async () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection, ...manualTimers() });
    session.close();
    await expect(session.createOffer()).rejects.toBeInstanceOf(PairingError);
    await expect(session.acceptOffer('v=0\r\n')).rejects.toBeInstanceOf(PairingError);
    await expect(session.acceptAnswer('v=0\r\n')).rejects.toBeInstanceOf(PairingError);
  });

  it('creates a connection per session rather than sharing a global one', () => {
    const created: PeerConnectionLike[] = [];
    const factory = () => {
      const connection = fakeConnection();
      created.push(connection);
      return connection;
    };
    createPeerSession({ createConnection: factory, ...manualTimers() });
    createPeerSession({ createConnection: factory, ...manualTimers() });
    expect(created).toHaveLength(2);
    expect(created[0]).not.toBe(created[1]);
  });
});

describe('the control channel on the answering side', () => {
  const remoteChannel = (label = 'writer-sync-control') => fakeDataChannel(label);

  it('opens a channel per purpose on the offering side', async () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection });
    await session.createOffer();

    const first = await session.openChannel('scope-1/awareness');
    const again = await session.openChannel('scope-1/awareness');
    await session.openChannel('scope-2/awareness');

    // One channel per purpose, and the same one for the same purpose: a second
    // channel for something already carried would leave each end reading a
    // different one.
    expect(first).toBe(again);
    expect(connection.channels).toEqual([
      'writer-sync-control',
      'scope-1/awareness',
      'scope-2/awareness',
    ]);
  });

  it('waits for the peer to open a channel on the answering side', async () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection });
    await session.acceptOffer('v=0\r\nOFFER\r\na=candidate\r\n');

    const pending = session.openChannel('scope-1/awareness');
    const opened = remoteChannel('scope-1/awareness');
    connection.peerOpensChannel(opened);

    // The answering device creates nothing: both creating one for the same
    // purpose would leave each holding a channel the other never reads.
    expect(await pending).toBe(opened);
    expect(connection.channels).toEqual([]);
  });

  it('reports every channel the peer opens, whatever it is for', async () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection });
    await session.acceptOffer('v=0\r\nOFFER\r\na=candidate\r\n');
    const seen: string[] = [];
    session.onAnyChannel((channel) => seen.push(channel.label));

    connection.peerOpensChannel(remoteChannel());
    connection.peerOpensChannel(remoteChannel('scope-1/operations'));

    // A device only asks for the channels it needs itself; one opened for a
    // scope it is not writing to is how it receives someone else's work.
    expect(seen).toEqual(['writer-sync-control', 'scope-1/operations']);
  });

  it('reports channels already adopted to a late subscriber', async () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection });
    await session.acceptOffer('v=0\r\nOFFER\r\na=candidate\r\n');
    connection.peerOpensChannel(remoteChannel('scope-1/operations'));

    const seen: string[] = [];
    session.onAnyChannel((channel) => seen.push(channel.label));

    expect(seen).toEqual(['scope-1/operations']);
  });

  it('keeps channels for different purposes apart', async () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection });
    await session.acceptOffer('v=0\r\nOFFER\r\na=candidate\r\n');
    connection.peerOpensChannel(remoteChannel());

    const awareness = remoteChannel('scope-1/awareness');
    connection.peerOpensChannel(awareness);

    expect(session.channel()?.label).toBe('writer-sync-control');
    expect(await session.openChannel('scope-1/awareness')).toBe(awareness);
  });

  it('adopts the channel the peer opens, having created none itself', async () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection });
    await session.acceptOffer('v=0\r\nOFFER\r\na=candidate\r\n');
    expect(session.channel()).toBeNull();

    const opened = remoteChannel();
    connection.peerOpensChannel(opened);

    expect(session.channel()).toBe(opened);
    expect(connection.channels).toEqual([]);
  });

  it('notifies a subscriber when the peer opens the channel', () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection });
    const seen: DataChannelLike[] = [];
    session.onChannel((channel) => seen.push(channel));

    const opened = remoteChannel();
    connection.peerOpensChannel(opened);

    expect(seen).toEqual([opened]);
  });

  it('notifies a late subscriber at once rather than never', async () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection });
    await session.createOffer();

    const seen: DataChannelLike[] = [];
    session.onChannel((channel) => seen.push(channel));

    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(session.channel());
  });

  it('keeps the first channel when the peer opens a second', async () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection });
    await session.createOffer();
    const first = session.channel();

    connection.peerOpensChannel(remoteChannel());

    expect(session.channel()).toBe(first);
  });

  it('stops listening for a remote channel once closed', () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection });
    expect(connection.remoteChannelListenerCount()).toBe(1);

    session.close();

    expect(connection.remoteChannelListenerCount()).toBe(0);
  });

  it('unsubscribes a channel listener on request', () => {
    const connection = fakeConnection({ gatheringCompletesImmediately: true });
    const session = createPeerSession({ createConnection: () => connection });
    const seen: DataChannelLike[] = [];
    const off = session.onChannel((channel) => seen.push(channel));

    off();
    connection.peerOpensChannel(remoteChannel());

    expect(seen).toEqual([]);
  });
});
