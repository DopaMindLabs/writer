/**
 * The pairing protocol: payload shapes, the wire codec, bounded QR carriage and
 * the state machine that orders a session.
 *
 * Transport- and framework-neutral by construction — nothing here knows what a
 * camera, a QR library or a WebRTC connection is. The application supplies those
 * and drives the machine.
 */

export {
  PAIRING_PROTOCOL_VERSION,
  PairingError,
  PairingErrorCode,
  PairingState,
  TERMINAL_PAIRING_STATES,
  isTerminalPairingState,
} from './pairing.types';
export type {
  PairingAnswer,
  PairingOffer,
  PairingPayload,
  PairingPayloadBase,
  PairingPayloadKind,
} from './pairing.types';

export {
  MAX_JWK_BYTES,
  MAX_PAYLOAD_BYTES,
  MAX_SDP_BYTES,
  decodePairingPayload,
  encodePairingPayload,
  pairingPayloadBytes,
} from './pairingCodec';

export {
  MAX_QR_CHUNK_BYTES,
  MAX_QR_PARTS,
  joinQrParts,
  parseQrPart,
  splitIntoQrParts,
} from './qrSequence';
export type { QrPart } from './qrSequence';

export { createPairingSession } from './pairingSession';
export type { PairingEvent, PairingRole, PairingSession } from './pairingSession';

export {
  MAX_CLOCK_SKEW_MILLIS,
  REPLAY_CACHE_CAPACITY,
  createReplayCache,
} from './replayCache';
export type { ReplayCache } from './replayCache';

export {
  MAX_SESSION_TTL_MILLIS,
  SESSION_TTL_MILLIS,
  validateInboundPayload,
} from './payloadValidation';
export type { ValidatePayloadOptions } from './payloadValidation';

export type {
  AuthenticatedPeerParameters,
  CreateOfferOptions,
  SignallingAdapter,
} from './signalling.types';

export { createQrSignallingAdapter } from './qrSignallingAdapter';
export type {
  QrSignallingAdapter,
  QrSignallingAdapterOptions,
  SignallingPeer,
} from './qrSignallingAdapter';
