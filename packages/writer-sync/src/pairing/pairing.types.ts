/**
 * The pairing protocol's vocabulary, specified in `docs/pairing-protocol.md`.
 * Types and error codes only — the codec and the state machine live beside
 * this file and depend on it, never the other way round.
 */

export const PAIRING_PROTOCOL_VERSION = 1;

/** What a payload is for. */
export type PairingPayloadKind = 'offer' | 'answer';

/** Fields both payloads carry (§4.1). */
export interface PairingPayloadBase {
  v: typeof PAIRING_PROTOCOL_VERSION;
  /** CSPRNG, 16 bytes base64url; minted by the initiator, echoed by the joiner. */
  sessionId: string;
  kind: PairingPayloadKind;
  /** Derived from `identityJwk` — never independently asserted. */
  deviceId: string;
  identityJwk: JsonWebKey;
  /** Fresh per session; the public half of the ephemeral ECDH pair. */
  ephemeralJwk: JsonWebKey;
  /** The complete gathered session description for this role. */
  sdp: string;
  /** CSPRNG, 16 bytes base64url, single use. */
  nonce: string;
  /** Absolute expiry, milliseconds since the Unix epoch. */
  expiresAt: number;
  signature: string;
}

export interface PairingOffer extends PairingPayloadBase {
  kind: 'offer';
}

export interface PairingAnswer extends PairingPayloadBase {
  kind: 'answer';
  /**
   * SHA-256 of the canonical offer bytes the joiner actually consumed, base64url.
   * This is what makes substitution detectable at the initiator without waiting
   * for a human to compare the verification code.
   */
  offerHash: string;
}

export type PairingPayload = PairingOffer | PairingAnswer;

/** Stable, loggable failure reasons (§13). */
export enum PairingErrorCode {
  UnsupportedVersion = 'unsupported-version',
  MalformedPayload = 'malformed-payload',
  NonCanonical = 'non-canonical',
  OversizedPayload = 'oversized-payload',
  BadQrSequence = 'bad-qr-sequence',
  Expired = 'expired',
  ReplayedNonce = 'replayed-nonce',
  SessionMismatch = 'session-mismatch',
  IdentityMismatch = 'identity-mismatch',
  BadSignature = 'bad-signature',
  TranscriptMismatch = 'transcript-mismatch',
  Unconfirmed = 'unconfirmed',
  DeviceRevoked = 'device-revoked',
  LocalConnectivity = 'local-connectivity',
  InvalidState = 'invalid-state',
  Cancelled = 'cancelled',
}

/**
 * Every pairing failure is one of these. The message is for developers; the
 * `code` is what UI copy and telemetry branch on, so it must never carry
 * peer-supplied text (threat model §5.11).
 */
export class PairingError extends Error {
  readonly code: PairingErrorCode;

  constructor(code: PairingErrorCode, detail?: string) {
    super(detail === undefined ? `Pairing failed: ${code}` : `Pairing failed: ${code} — ${detail}`);
    this.name = 'PairingError';
    this.code = code;
  }
}

/** The pairing state machine's states (§12). */
export enum PairingState {
  Idle = 'idle',
  Creating = 'creating',
  AwaitingPeer = 'awaiting-peer',
  Authenticating = 'authenticating',
  AwaitingConfirmation = 'awaiting-confirmation',
  TransferringKeys = 'transferring-keys',
  Complete = 'complete',
  Expired = 'expired',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

/** The four states from which no transition leads anywhere. */
export const TERMINAL_PAIRING_STATES: readonly PairingState[] = [
  PairingState.Complete,
  PairingState.Expired,
  PairingState.Cancelled,
  PairingState.Failed,
];

export const isTerminalPairingState = (state: PairingState): boolean =>
  TERMINAL_PAIRING_STATES.includes(state);
