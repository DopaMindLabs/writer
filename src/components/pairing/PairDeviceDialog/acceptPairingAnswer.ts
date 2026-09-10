import { decodePairingPayload, type PairingSession } from 'writer-sync/pairing';
import type { PairingSignaller } from '@/lib/writerSyncIntegration/createPairingSignaller';
import { failureActionFor, type PairingExchangeAction } from './pairingExchangeReducer';

/**
 * The initiator's second half: take the joiner's reply and authenticate it.
 *
 * Resolving means the two transcripts agree — never that a human has compared
 * the digits. The confirmation gate that follows is the machine's, not this
 * module's.
 */

export interface AcceptAnswerOptions {
  /** The reassembled answer payload text, as scanned or pasted. */
  payload: string;
  signaller: PairingSignaller;
  machine: PairingSession;
  dispatch: (action: PairingExchangeAction) => void;
}

export const acceptPairingAnswer = async (options: AcceptAnswerOptions): Promise<void> => {
  const { payload, signaller, machine, dispatch } = options;
  try {
    machine.apply('peer-payload-received');
    dispatch({ type: 'peer-payload-received' });
    const answer = await decodePairingPayload(payload);
    if (answer.kind !== 'answer') throw new Error('not an answer payload');
    const peer = await signaller.adapter.acceptAnswer(answer);
    machine.apply('authenticated');
    dispatch({ type: 'authenticated', peer });
  } catch (error) {
    // The reason is for developers: a pairing failure must never put
    // peer-supplied text on screen (threat model §5.11) — only a nameable
    // cause from the fixed set, of which an expired reply is the common one.
    machine.apply('fail');
    dispatch(failureActionFor(error));
  }
};
