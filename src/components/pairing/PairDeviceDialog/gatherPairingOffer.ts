import {
  SESSION_TTL_MILLIS,
  createPairingSession,
  encodePairingPayload,
  type PairingSession,
} from 'writer-sync/pairing';
import type {
  PairingSignaller,
  PairingSignallerOptions,
} from '@/lib/writerSyncIntegration/createPairingSignaller';
import type { PairingExchangeAction } from './pairingExchangeReducer';

/**
 * Open a signaller, start the protocol machine and gather this device's offer.
 *
 * Split from the hook because the ordering matters and reads better as one
 * sequence than as an effect body: the machine starts before anything is
 * gathered, and the offer is only announced once `payload-ready` has been
 * accepted — so the view can never show a code the machine has not reached.
 */

export interface GatherOfferOptions {
  createSignaller: (options?: PairingSignallerOptions) => Promise<PairingSignaller>;
  /** Whether the dialog has closed since this began. */
  isDismissed: () => boolean;
  /** Hand back what must be torn down and driven later. */
  adopt: (signaller: PairingSignaller, machine: PairingSession) => void;
  dispatch: (action: PairingExchangeAction) => void;
}

export const gatherPairingOffer = async (options: GatherOfferOptions): Promise<void> => {
  const { createSignaller, isDismissed, adopt, dispatch } = options;
  try {
    const signaller = await createSignaller();
    // Dismissed while opening: close what was opened rather than leaving a
    // connection behind for the garbage collector to maybe notice.
    if (isDismissed()) {
      signaller.close();
      return;
    }
    const machine = createPairingSession('initiator');
    machine.apply('start');
    adopt(signaller, machine);

    const offer = await signaller.adapter.createOffer({
      sessionId: signaller.sessionId,
      expiresAt: Date.now() + SESSION_TTL_MILLIS,
    });
    const payload = await encodePairingPayload(offer);
    if (isDismissed()) return;
    machine.apply('payload-ready');
    dispatch({ type: 'offer-ready', payload, sessionId: offer.sessionId });
  } catch {
    // The reason is for developers: a pairing failure must never put
    // peer-supplied text on screen (threat model §5.11).
    if (!isDismissed()) dispatch({ type: 'failed' });
  }
};
