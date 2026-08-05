import type { PairingRootWrapper } from '../crypto/keyVault.types';
import { ROOT_TRANSFER_VERSION, type RootTransferMessage } from './rootTransferMessage';

/**
 * Transfers the root secret after both devices confirm the verification code.
 * Peers advertise their key state, repeat announcements across uneven user
 * timing, and enter sync only after both sides report readiness.
 */

export type RootTransferOutcome =
  /** This device sealed its root for the peer. */
  | 'sent'
  /** This device received a root and installed it. */
  | 'received'
  /** Both devices already held one. */
  | 'not-needed';

/** A root as it travels: sealed to the peer, at the epoch it derives with. */
export interface SealedRoot {
  wrapper: PairingRootWrapper;
  epoch: number;
}

export interface RootTransferPorts {
  /** Whether this device already holds key material. */
  holdsRoot: () => boolean;
  /**
   * Whether this is the device to mint the root secret when neither holds one.
   *
   * Two devices that have never been used cannot each wait for the other, and
   * if both minted they would seal their writing under two different keys. Both
   * already learned each other's identity during the exchange, so the answer
   * needs no further round trip — and unlike the *role* rule, both devices are
   * running this protocol and will hear each other, so a device that defers is
   * deferring to one that is certainly about to act.
   */
  mintsFirst: () => boolean;
  /** Create this device's root secret, so it has one to seal and to share. */
  createRoot: () => Promise<void>;
  /** Seal this device's root for the authenticated peer, with its epoch. */
  wrapForPeer: () => Promise<SealedRoot>;
  /** Open a wrapper and install what it carries at the epoch it names. */
  acceptWrapper: (sealed: SealedRoot) => Promise<void>;
  send: (message: RootTransferMessage) => void;
  /** Diagnostics. A failed transfer never surfaces peer-supplied detail. */
  onError?: (error: unknown) => void;
  /** Injected so tests need no real clock. */
  setTimer?: (callback: () => void, millis: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

/** Often enough to cross the gap between two confirmations, rarely enough to be free. */
export const ANNOUNCE_INTERVAL_MILLIS = 500;

export interface RootTransfer {
  /** Announce what this device holds, and keep announcing until answered. */
  start: () => void;
  /** Take one decoded message from the peer. */
  receive: (message: RootTransferMessage) => Promise<void>;
  /** How this ended, once it has. */
  settled: () => Promise<RootTransferOutcome>;
  stop: () => void;
}

interface Announcer {
  start: () => void;
  /** Change what is being repeated, and say it now. */
  say: (refrain: Refrain) => void;
  stop: () => void;
}

/** What this device is saying while it waits for the peer to catch up. */
type Refrain = 'state' | 'ready';

/** Says the same thing, again and again, until told to stop. */
const createAnnouncer = (ports: RootTransferPorts): Announcer => {
  const setTimer = ports.setTimer ?? ((callback, millis) => setTimeout(callback, millis));
  const clearTimer =
    ports.clearTimer ??
    ((handle) => {
      clearTimeout(handle as ReturnType<typeof setTimeout>);
    });
  let handle: unknown = null;
  let saying: Refrain = 'state';

  const announce = (): void => {
    if (saying === 'ready') {
      ports.send({ v: ROOT_TRANSFER_VERSION, kind: 'ready' });
      return;
    }
    ports.send({
      v: ROOT_TRANSFER_VERSION,
      kind: ports.holdsRoot() ? 'holds-root' : 'needs-root',
    });
  };

  const stop = (): void => {
    if (handle !== null) clearTimer(handle);
    handle = null;
  };

  const repeat = (): void => {
    handle = setTimer(() => {
      announce();
      repeat();
    }, ANNOUNCE_INTERVAL_MILLIS);
  };

  return {
    start: () => {
      announce();
      repeat();
    },
    say: (refrain: Refrain) => {
      saying = refrain;
      announce();
    },
    stop,
  };
};

interface TransferState {
  started: boolean;
  peerNeedsRoot: boolean;
  /** The peer has said it has nothing further to say about keys. */
  peerReady: boolean;
  /** What happened here, once it has; the exchange still awaits the peer. */
  outcome: RootTransferOutcome | null;
}

/** What one side of the exchange needs in order to answer a message. */
interface TransferContext {
  ports: RootTransferPorts;
  announcer: Announcer;
  settle: (result: RootTransferOutcome) => void;
  attempt: (work: () => Promise<void>, result: RootTransferOutcome) => Promise<void>;
  sealForPeer: () => Promise<void>;
  /** Mint the root secret, then hand it straight to the peer that has none. */
  mintAndSeal: () => Promise<void>;
  /** Leave the conversation, but only once both ends have finished it. */
  finishTogether: () => void;
  /** Mutable because these facts arrive from opposite directions in time. */
  state: TransferState;
}

/**
 * The peer has nothing further to say about keys.
 *
 * A peer that is ready has stopped saying what it holds — the two refrains
 * replace each other, so a device that missed the earlier ones would never
 * learn there was nothing to move, and would wait out a deadline over a
 * conversation both ends had in fact finished. It never asked for a root and
 * this device has one, so there is nothing either of them needs.
 */
const takePeerReady = (context: TransferContext): void => {
  const { ports, settle, state } = context;
  state.peerReady = true;
  if (state.outcome === null && ports.holdsRoot() && !state.peerNeedsRoot) {
    settle('not-needed');
    return;
  }
  context.finishTogether();
};

const receiveMessage = async (
  context: TransferContext,
  message: RootTransferMessage,
): Promise<void> => {
  const { ports, settle, attempt, sealForPeer, state } = context;
  if (message.kind === 'needs-root') {
    // A peer that confirmed first announced into a channel nobody was reading
    // yet. Remembering the request is what lets this device answer its repeat —
    // or answer at once, if it has since started.
    state.peerNeedsRoot = true;
    if (!state.started) return;
    if (!ports.holdsRoot() && ports.mintsFirst()) await context.mintAndSeal();
    else if (ports.holdsRoot()) await sealForPeer();
    return;
  }
  if (message.kind === 'ready') {
    takePeerReady(context);
    return;
  }
  if (message.kind === 'holds-root') {
    if (ports.holdsRoot()) settle('not-needed');
    return;
  }
  // An unasked-for root is refused: this device's rows are sealed under the key
  // it already has, and replacing it would orphan every one of them.
  if (ports.holdsRoot()) return;
  await attempt(
    () => ports.acceptWrapper({ wrapper: message.wrapper, epoch: message.epoch }),
    'received',
  );
};

/** The steps either device may take, and the one-shot guard around them. */
const createActions = (
  ports: RootTransferPorts,
  announcer: Announcer,
  state: TransferState,
  resolve: (outcome: RootTransferOutcome) => void,
) => {
  let finished = false;

  /**
   * Hand the channel on, once neither end is still listening for keys. Sync
   * follows here with a decoder of its own, and a message sent to a device still
   * reading for keys is swallowed rather than repeated.
   */
  const finishTogether = (): void => {
    const result = state.outcome;
    if (finished || result === null || !state.peerReady) return;
    finished = true;
    announcer.stop();
    resolve(result);
  };

  const settle = (result: RootTransferOutcome): void => {
    if (finished || state.outcome !== null) return;
    state.outcome = result;
    // Nothing further to say about keys — but keep saying *that* until the peer
    // agrees, so neither device leaves the conversation alone.
    announcer.say('ready');
    finishTogether();
  };

  const attempt = async (
    work: () => Promise<void>,
    result: RootTransferOutcome,
  ): Promise<void> => {
    if (finished || state.outcome !== null) return;
    try {
      await work();
      settle(result);
    } catch (error) {
      ports.onError?.(error);
    }
  };

  const sealForPeer = (): Promise<void> =>
    attempt(async () => {
      const sealed = await ports.wrapForPeer();
      ports.send({
        v: ROOT_TRANSFER_VERSION,
        kind: 'root',
        wrapper: sealed.wrapper,
        epoch: sealed.epoch,
      });
    }, 'sent');

  /**
   * Mint the root secret, then hand it straight on. Minting is not wrapped in
   * `attempt`: it is a step towards sending rather than an outcome of its own,
   * and a device that created a root but failed to seal it must keep what it
   * created — it is now the only copy.
   */
  const mintAndSeal = async (): Promise<void> => {
    try {
      await ports.createRoot();
    } catch (error) {
      ports.onError?.(error);
      return;
    }
    await sealForPeer();
  };

  return { settle, attempt, sealForPeer, mintAndSeal, finishTogether };
};

export const startRootTransfer = (ports: RootTransferPorts): RootTransfer => {
  const announcer = createAnnouncer(ports);
  const state: TransferState = {
    started: false,
    peerNeedsRoot: false,
    peerReady: false,
    outcome: null,
  };
  let resolveOutcome: ((outcome: RootTransferOutcome) => void) | null = null;
  const outcome = new Promise<RootTransferOutcome>((resolve) => {
    resolveOutcome = resolve;
  });

  const actions = createActions(ports, announcer, state, (result) => {
    resolveOutcome?.(result);
  });
  const context: TransferContext = { ports, announcer, state, ...actions };

  return {
    start: () => {
      state.started = true;
      announcer.start();
      if (!state.peerNeedsRoot) return;
      if (ports.holdsRoot()) void actions.sealForPeer();
      else if (ports.mintsFirst()) void actions.mintAndSeal();
    },
    receive: (message) => receiveMessage(context, message),
    settled: () => outcome,
    stop: announcer.stop,
  };
};
