import type { PairingSession } from 'writer-sync/pairing';
import type {
  PairingSignaller,
  PairingSignallerOptions,
} from '@/lib/writerSyncIntegration/createPairingSignaller';
import { acceptPairingAnswer } from './acceptPairingAnswer';
import { answerPairingOffer } from './answerPairingOffer';
import { decideScannedPayload } from './decideScannedPayload';
import { startPairingExchange } from './startPairingExchange';
import type { PairingExchangeAction } from './pairingExchangeReducer';

/**
 * What this device does with a code it has just read.
 *
 * Kept out of the hook because it is the flow's one branching decision and
 * reads better as a sequence than as a callback body: the payload says which
 * half this device runs, and each answer leads somewhere different.
 */

export interface AnswerScannedOfferOptions {
  payload: string;
  /** The session this device was offering, which the reply cannot come from. */
  previous: PairingSignaller | null;
  createSignaller: (options?: PairingSignallerOptions) => Promise<PairingSignaller>;
  /** Whether the dialog has closed since this began. */
  isDismissed: () => boolean;
  adopt: (signaller: PairingSignaller, machine: PairingSession) => void;
  dispatch: (action: PairingExchangeAction) => void;
}

/**
 * Answer an offer this device read, from a session opened for the purpose.
 *
 * The offer it was showing is closed first. A device cannot answer a
 * description it authored itself, so that connection has no part left to play,
 * and leaving it open would hold a peer connection nothing will ever use.
 */
export const answerScannedOffer = async (
  options: AnswerScannedOfferOptions,
): Promise<void> => {
  const { payload, previous, createSignaller, isDismissed, adopt, dispatch } = options;
  previous?.close();
  dispatch({ type: 'answering' });
  const started = await startPairingExchange({
    role: 'joiner',
    createSignaller,
    dispatch,
    isDismissed,
    adopt,
  });
  if (started === null) return;
  await answerPairingOffer({
    payload,
    signaller: started.signaller,
    machine: started.machine,
    dispatch,
  });
};

export interface TakeScannedPayloadOptions
  extends Omit<AnswerScannedOfferOptions, 'previous'> {
  /** The session currently open on this device. */
  signaller: PairingSignaller;
  machine: PairingSession;
}

export const takeScannedPayload = async (
  options: TakeScannedPayloadOptions,
): Promise<void> => {
  const { payload, signaller, machine, dispatch } = options;
  const decision = await decideScannedPayload({ deviceId: signaller.deviceId, payload });

  if (decision === 'accept-answer') {
    await acceptPairingAnswer({ payload, signaller, machine, dispatch });
    return;
  }
  if (decision === 'answer-offer') {
    await answerScannedOffer({ ...options, previous: signaller });
    return;
  }
  // A code this device authored asks nothing of it, and is a mistake worth
  // naming rather than a failure worth ending the exchange over.
  dispatch(decision === 'own-code' ? { type: 'own-code-scanned' } : { type: 'failed' });
};
