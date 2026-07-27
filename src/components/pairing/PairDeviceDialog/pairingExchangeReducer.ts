import type { AuthenticatedPeerParameters } from 'writer-sync/pairing';

/**
 * What the pairing dialog shows, as a value rather than a scatter of booleans.
 *
 * Mirrors the initiator path of the protocol's state machine (§12) without
 * duplicating its rules: the machine in the package decides whether an event is
 * legal, and this decides what the user sees once it has.
 */

export type ExchangePhase =
  | 'creating'
  | 'awaiting-peer'
  | 'authenticating'
  | 'awaiting-confirmation'
  | 'complete'
  | 'failed';

export interface PairingExchangeState {
  phase: ExchangePhase;
  /** The encoded offer, once gathered. */
  offerPayload: string | null;
  sessionId: string | null;
  /** What the peer proved, once both payloads are in hand. */
  peer: AuthenticatedPeerParameters | null;
}

export type PairingExchangeAction =
  | { type: 'restart' }
  | { type: 'offer-ready'; payload: string; sessionId: string }
  | { type: 'answer-received' }
  | { type: 'authenticated'; peer: AuthenticatedPeerParameters }
  | { type: 'confirmed' }
  | { type: 'failed' };

export const initialExchangeState: PairingExchangeState = {
  phase: 'creating',
  offerPayload: null,
  sessionId: null,
  peer: null,
};

export const pairingExchangeReducer = (
  state: PairingExchangeState,
  action: PairingExchangeAction,
): PairingExchangeState => {
  switch (action.type) {
    case 'restart':
      return initialExchangeState;
    case 'offer-ready':
      return {
        ...state,
        phase: 'awaiting-peer',
        offerPayload: action.payload,
        sessionId: action.sessionId,
      };
    case 'answer-received':
      return { ...state, phase: 'authenticating' };
    case 'authenticated':
      return { ...state, phase: 'awaiting-confirmation', peer: action.peer };
    case 'confirmed':
      return { ...state, phase: 'complete' };
    case 'failed':
      return { ...state, phase: 'failed' };
  }
};
