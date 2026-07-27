import type { AuthenticatedPeerParameters, PairingRole } from 'writer-sync/pairing';

/**
 * What the pairing dialog shows, as a value rather than a scatter of booleans.
 *
 * Mirrors the protocol's state machine (§12) without duplicating its rules: the
 * machine in the package decides whether an event is legal, and this decides
 * what the user sees once it has.
 *
 * Both roles share one reducer because they share one shape. Which half of the
 * exchange a device is running changes what it *shows* at a phase, not what the
 * phases are — the initiator shows an offer while it waits, the joiner shows a
 * reply, and both hold at the same confirmation gate.
 */

export type ExchangePhase =
  | 'choosing'
  | 'creating'
  | 'awaiting-peer'
  | 'awaiting-offer'
  | 'authenticating'
  | 'awaiting-confirmation'
  | 'complete'
  | 'failed';

export interface PairingExchangeState {
  phase: ExchangePhase;
  /** Which half of the exchange this device runs, once chosen. */
  role: PairingRole | null;
  /** The encoded offer, once gathered by the initiator. */
  offerPayload: string | null;
  /** The encoded reply, once minted by the joiner. */
  answerPayload: string | null;
  sessionId: string | null;
  /** What the peer proved, once both payloads are in hand. */
  peer: AuthenticatedPeerParameters | null;
}

export type PairingExchangeAction =
  | { type: 'restart' }
  | { type: 'begin'; role: PairingRole }
  | { type: 'offer-ready'; payload: string; sessionId: string }
  | { type: 'peer-payload-received' }
  | { type: 'authenticated'; peer: AuthenticatedPeerParameters }
  | {
      type: 'answer-ready';
      payload: string;
      sessionId: string;
      peer: AuthenticatedPeerParameters;
    }
  | { type: 'confirmed' }
  | { type: 'failed' };

export const initialExchangeState: PairingExchangeState = {
  phase: 'choosing',
  role: null,
  offerPayload: null,
  answerPayload: null,
  sessionId: null,
  peer: null,
};

/** The initiator gathers before it can show anything; the joiner reads first. */
const openingPhase = (role: PairingRole): ExchangePhase =>
  role === 'initiator' ? 'creating' : 'awaiting-offer';

export const pairingExchangeReducer = (
  state: PairingExchangeState,
  action: PairingExchangeAction,
): PairingExchangeState => {
  switch (action.type) {
    case 'restart':
      return initialExchangeState;
    case 'begin':
      return { ...initialExchangeState, role: action.role, phase: openingPhase(action.role) };
    case 'offer-ready':
      return {
        ...state,
        phase: 'awaiting-peer',
        offerPayload: action.payload,
        sessionId: action.sessionId,
      };
    case 'peer-payload-received':
      return { ...state, phase: 'authenticating' };
    case 'authenticated':
      return { ...state, phase: 'awaiting-confirmation', peer: action.peer };
    case 'answer-ready':
      return {
        ...state,
        phase: 'awaiting-confirmation',
        answerPayload: action.payload,
        sessionId: action.sessionId,
        peer: action.peer,
      };
    case 'confirmed':
      return { ...state, phase: 'complete' };
    case 'failed':
      return { ...state, phase: 'failed' };
  }
};
