import {
  PairingError,
  PairingErrorCode,
  type AuthenticatedPeerParameters,
  type PairingRole,
} from 'writer-sync/pairing';

/**
 * What the pairing dialog shows, as a value rather than a scatter of booleans.
 *
 * Mirrors the protocol's state machine (§12) without duplicating its rules: the
 * machine in the package decides whether an event is legal, and this decides
 * what the user sees once it has.
 *
 * Every device starts the same way — offering its own code and watching for the
 * other's — because neither can work out which half it runs without a channel it
 * does not yet have, and asking the user to choose asks them to understand the
 * protocol before they can begin. The role is settled by the payload that
 * arrives (`resolvePairingRole`), which is why it is state here rather than
 * something the dialog is told.
 */

export type ExchangePhase =
  | 'creating'
  | 'awaiting-peer'
  | 'authenticating'
  | 'awaiting-confirmation'
  | 'complete'
  | 'failed';

/**
 * Why the exchange failed, when the reason changes what the user should do.
 * Always one of a fixed set — never derived from error text, which may carry
 * peer-supplied content (threat model §5.11).
 */
export type ExchangeFailureReason = 'too-large';

export interface PairingExchangeState {
  phase: ExchangePhase;
  /** Which half of the exchange this device turned out to run. */
  role: PairingRole;
  /** The encoded offer, once gathered. */
  offerPayload: string | null;
  /** The encoded reply, once minted in answer to a peer's offer. */
  answerPayload: string | null;
  sessionId: string | null;
  /** What the peer proved, once both payloads are in hand. */
  peer: AuthenticatedPeerParameters | null;
  /**
   * The last code read was this device's own. Kept as state rather than shown
   * and forgotten, because the scanner stays open: the user has to be told what
   * happened and left where they can try the other device's code.
   */
  ownCodeScanned: boolean;
  /** Set only in the `failed` phase, and only when the cause is nameable. */
  failureReason: ExchangeFailureReason | null;
}

export type PairingExchangeAction =
  | { type: 'restart' }
  | { type: 'offer-ready'; payload: string; sessionId: string }
  | { type: 'own-code-scanned' }
  | { type: 'answering' }
  | { type: 'peer-payload-received' }
  | { type: 'authenticated'; peer: AuthenticatedPeerParameters }
  | {
      type: 'answer-ready';
      payload: string;
      sessionId: string;
      peer: AuthenticatedPeerParameters;
    }
  | { type: 'confirmed' }
  | { type: 'failed'; reason?: ExchangeFailureReason };

/**
 * The one mapping from a caught error to a failure action.
 *
 * A payload too large to encode is the only failure whose advice differs —
 * retrying will not shrink it — so it is the only one named. Everything else
 * stays generic: the reason is for developers, and failure copy must never
 * carry peer-supplied text.
 */
export const failureActionFor = (error: unknown): PairingExchangeAction =>
  error instanceof PairingError && error.code === PairingErrorCode.OversizedPayload
    ? { type: 'failed', reason: 'too-large' }
    : { type: 'failed' };

export const initialExchangeState: PairingExchangeState = {
  phase: 'creating',
  role: 'initiator',
  offerPayload: null,
  answerPayload: null,
  sessionId: null,
  peer: null,
  ownCodeScanned: false,
  failureReason: null,
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
    case 'own-code-scanned':
      return { ...state, ownCodeScanned: true };
    case 'answering':
      // The offer this device was showing is dropped rather than kept beside
      // the reply: a device cannot answer a description it authored itself, so
      // leaving it up would show a code nobody can finish the exchange with.
      return { ...initialExchangeState, role: 'joiner', phase: 'authenticating' };
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
      return { ...state, phase: 'failed', failureReason: action.reason ?? null };
  }
};
