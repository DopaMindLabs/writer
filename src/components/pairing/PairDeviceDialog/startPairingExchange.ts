import {
  SESSION_TTL_MILLIS,
  createPairingSession,
  encodePairingPayload,
  type PairingRole,
  type PairingSession,
} from 'writer-sync/pairing';
import type {
  PairingSignaller,
  PairingSignallerOptions,
} from '@/lib/writerSyncIntegration/createPairingSignaller';
import { failureActionFor, type PairingExchangeAction } from './pairingExchangeReducer';

/**
 * Open a signaller, start the protocol machine, and — for the initiator —
 * gather this device's offer.
 *
 * Split from the hook because the ordering matters and reads better as one
 * sequence than as an effect body: the machine starts before anything is
 * gathered, and the offer is only announced once `payload-ready` has been
 * accepted — so the view can never show a code the machine has not reached.
 *
 * The joiner stops after `start`. It has nothing to gather until it has seen an
 * offer: its connection is answered *against* the peer's description, so
 * gathering first would produce a description bound to nothing.
 */

export interface StartExchangeOptions {
  role: PairingRole;
  createSignaller: (options?: PairingSignallerOptions) => Promise<PairingSignaller>;
  /** Whether the dialog has closed since this began. */
  isDismissed: () => boolean;
  /** Hand back what must be torn down and driven later. */
  adopt: (signaller: PairingSignaller, machine: PairingSession) => void;
  dispatch: (action: PairingExchangeAction) => void;
}

const gatherOffer = async (
  options: Pick<StartExchangeOptions, 'isDismissed' | 'dispatch'> & {
    signaller: PairingSignaller;
    machine: PairingSession;
  },
): Promise<void> => {
  const { signaller, machine, isDismissed, dispatch } = options;
  const offer = await signaller.adapter.createOffer({
    sessionId: signaller.sessionId,
    expiresAt: Date.now() + SESSION_TTL_MILLIS,
  });
  const payload = await encodePairingPayload(offer);
  if (isDismissed()) return;
  machine.apply('payload-ready');
  dispatch({ type: 'offer-ready', payload, sessionId: offer.sessionId });
};

/** What was opened, for a caller that has to drive it straight away. */
export interface StartedExchange {
  signaller: PairingSignaller;
  machine: PairingSession;
}

export const startPairingExchange = async (
  options: StartExchangeOptions,
): Promise<StartedExchange | null> => {
  const { role, createSignaller, isDismissed, adopt, dispatch } = options;
  try {
    const signaller = await createSignaller();
    // Dismissed while opening: close what was opened rather than leaving a
    // connection behind for the garbage collector to maybe notice.
    if (isDismissed()) {
      signaller.close();
      return null;
    }
    const machine = createPairingSession(role);
    machine.apply('start');
    adopt(signaller, machine);
    if (role === 'initiator') {
      await gatherOffer({ signaller, machine, isDismissed, dispatch });
    }
    return { signaller, machine };
  } catch (error) {
    // The reason is for developers: a pairing failure must never put
    // peer-supplied text on screen (threat model §5.11). The one exception is
    // a payload too large to encode, which is named — retrying cannot shrink it.
    if (!isDismissed()) dispatch(failureActionFor(error));
    return null;
  }
};
