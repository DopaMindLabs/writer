import {
  decodePairingPayload,
  encodePairingPayload,
  type PairingSession,
} from 'writer-sync/pairing';
import type { PairingSignaller } from '@/lib/writerSyncIntegration/createPairingSignaller';
import type { PairingExchangeAction } from './pairingExchangeReducer';

/**
 * The joiner's half: take the initiator's offer, answer it, and hold the reply
 * for the initiator to read back.
 *
 * The joiner reaches the confirmation gate one step earlier than the initiator
 * — minting the answer is what binds the transcript, so this device knows the
 * verification code before its peer has seen the reply. It still stops at the
 * gate: what has been *authenticated* is that both descriptions agree, never
 * that a human has compared the digits.
 */

export interface AnswerOfferOptions {
  /** The reassembled offer payload text, as scanned or pasted. */
  payload: string;
  signaller: PairingSignaller;
  machine: PairingSession;
  dispatch: (action: PairingExchangeAction) => void;
}

export const answerPairingOffer = async (options: AnswerOfferOptions): Promise<void> => {
  const { payload, signaller, machine, dispatch } = options;
  try {
    machine.apply('peer-payload-received');
    dispatch({ type: 'peer-payload-received' });
    const offer = await decodePairingPayload(payload);
    if (offer.kind !== 'offer') throw new Error('not an offer payload');
    const answer = await signaller.adapter.acceptOffer(offer);
    const answerPayload = await encodePairingPayload(answer);
    machine.apply('payload-ready');
    const peer = signaller.adapter.parameters();
    if (peer === null) throw new Error('answered without authenticating the peer');
    machine.apply('authenticated');
    dispatch({
      type: 'answer-ready',
      payload: answerPayload,
      sessionId: answer.sessionId,
      peer,
    });
  } catch {
    // As above: never surface peer-supplied detail.
    machine.apply('fail');
    dispatch({ type: 'failed' });
  }
};
