import type { DeviceId } from '../core/ids';
import type { PairingAnswer, PairingOffer } from './pairing.types';

/**
 * The signalling port, specified in `docs/pairing-protocol.md` §5 and runbook
 * §21.
 *
 * **Pairing establishes trust; signalling exchanges connection parameters.** They
 * share a UI flow and stay separate contracts, so the WebRTC provider depends on
 * this port rather than on a QR library, a camera, a URL or a socket. Writer's
 * default implementation carries the parameters through two QR symbols; a native
 * host could carry them over the LAN instead without the provider noticing.
 */

export interface CreateOfferOptions {
  /** Identifies the session both payloads must agree on. */
  sessionId: string;
  /** Absolute expiry stamped into the payload. */
  expiresAt: number;
}

/**
 * What a peer proves once both payloads have been exchanged and authenticated:
 * who it is, and the transcript that binds the exchange. A transport takes these
 * rather than raw SDP, so it cannot open a session that was never authenticated.
 */
export interface AuthenticatedPeerParameters {
  deviceId: DeviceId;
  publicIdentityJwk: JsonWebKey;
  /** The transcript both ends computed independently. */
  transcript: Uint8Array;
  /** Derived from the transcript; displayed for the user to compare. */
  verificationCode: string;
}

export interface SignallingAdapter {
  /** Gather this device's offer and stamp it into a signed payload. */
  createOffer: (options: CreateOfferOptions) => Promise<PairingOffer>;
  /** Consume a peer's offer and produce this device's answer. */
  acceptOffer: (offer: PairingOffer) => Promise<PairingAnswer>;
  /**
   * Consume the peer's answer and finish authentication. Resolving means the
   * transcripts agree; it does **not** mean the user has confirmed, which is a
   * separate state in the pairing machine.
   */
  acceptAnswer: (answer: PairingAnswer) => Promise<AuthenticatedPeerParameters>;
}
