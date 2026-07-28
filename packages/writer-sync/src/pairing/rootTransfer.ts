import type { PairingRootWrapper } from '../crypto/keyVault.types';
import { ROOT_TRANSFER_VERSION, type RootTransferMessage } from './rootTransferMessage';

/**
 * Handing an account root to a device that has just been paired.
 *
 * A device paired for the first time holds no key material, so it can decrypt
 * nothing it is sent and would sit connected and empty. This is the step that
 * fixes that, and it runs only after a human has confirmed the codes — key
 * transfer belongs to the state *after* `awaiting-confirmation`, never to
 * connectivity alone (`docs/pairing-protocol.md` §§11–12).
 *
 * **Neither device is told which part to play.** The pairing roles say nothing
 * about which device has been used before — the one that scanned may equally be
 * the one that holds everything — so each announces what it has and the holder
 * seals the root for the one that lacks it.
 *
 * **Announcements repeat until the peer is heard.** A data channel drops what
 * arrives before anything is listening, and two people do not press "the codes
 * match" at the same instant, so a single announcement would be lost whenever
 * one device confirmed first. Repeating costs one small message; the alternative
 * is a pairing that completes and silently transfers nothing.
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
   * Whether this is the device to create the account when neither holds one.
   *
   * Two devices that have never been used cannot each wait for the other, and
   * if both minted they would seal their writing under two different keys. Both
   * already learned each other's identity during the exchange, so the answer
   * needs no further round trip — and unlike the *role* rule, both devices are
   * running this protocol and will hear each other, so a device that defers is
   * deferring to one that is certainly about to act.
   */
  mintsFirst: () => boolean;
  /** Create this device's account root, so it has one to seal and to share. */
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
  stop: () => void;
}

/** Says what this device holds, again and again, until told to stop. */
const createAnnouncer = (ports: RootTransferPorts): Announcer => {
  const setTimer = ports.setTimer ?? ((callback, millis) => setTimeout(callback, millis));
  const clearTimer =
    ports.clearTimer ??
    ((handle) => {
      clearTimeout(handle as ReturnType<typeof setTimeout>);
    });
  let handle: unknown = null;

  const announce = (): void => {
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
    stop,
  };
};

/** What one side of the exchange needs in order to answer a message. */
interface TransferContext {
  ports: RootTransferPorts;
  announcer: Announcer;
  settle: (result: RootTransferOutcome) => void;
  attempt: (work: () => Promise<void>, result: RootTransferOutcome) => Promise<void>;
  sealForPeer: () => Promise<void>;
  /** Create the account, then hand it straight to the peer that has none. */
  mintAndSeal: () => Promise<void>;
  /** Mutable because its two facts arrive from opposite directions in time. */
  state: { started: boolean; peerNeedsRoot: boolean };
}

const receiveMessage = async (
  context: TransferContext,
  message: RootTransferMessage,
): Promise<void> => {
  const { ports, announcer, settle, attempt, sealForPeer, state } = context;
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
  if (message.kind === 'holds-root') {
    announcer.stop();
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
  resolve: (outcome: RootTransferOutcome) => void,
) => {
  let finished = false;

  const settle = (result: RootTransferOutcome): void => {
    if (finished) return;
    finished = true;
    announcer.stop();
    resolve(result);
  };

  const attempt = async (
    work: () => Promise<void>,
    result: RootTransferOutcome,
  ): Promise<void> => {
    if (finished) return;
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
   * Create the account, then hand it straight on. Minting is not wrapped in
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

  return { settle, attempt, sealForPeer, mintAndSeal };
};

export const startRootTransfer = (ports: RootTransferPorts): RootTransfer => {
  const announcer = createAnnouncer(ports);
  const state = { started: false, peerNeedsRoot: false };
  let resolveOutcome: ((outcome: RootTransferOutcome) => void) | null = null;
  const outcome = new Promise<RootTransferOutcome>((resolve) => {
    resolveOutcome = resolve;
  });

  const actions = createActions(ports, announcer, (result) => resolveOutcome?.(result));
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
