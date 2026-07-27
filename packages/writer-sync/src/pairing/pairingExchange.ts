import { asDeviceId } from '../core/ids';
import { toBase64Url } from '../crypto/base64url';
import {
  deviceIdFor,
  publicJwkOf,
  type DeviceIdentityKeys,
} from '../crypto/deviceIdentity';
import { signPairingPayload } from '../crypto/deviceSignature';
import {
  ephemeralPublicJwkOf,
  type PairingEphemeralKeys,
} from '../crypto/pairingKeyAgreement';
import { pairingTranscript, verificationCode } from '../crypto/pairingTranscript';
import {
  PAIRING_PROTOCOL_VERSION,
  type PairingAnswer,
  type PairingOffer,
  type PairingPayload,
} from './pairing.types';
import { pairingPayloadBytes } from './pairingCodec';
import type { AuthenticatedPeerParameters } from './signalling.types';

/**
 * Turning a gathered session description into a payload another device can be
 * asked to trust, and binding a completed pair into its transcript.
 *
 * Everything here is a pure function of its inputs: no session state, no clock,
 * no connection. The adapter beside this file owns the ordering and the state;
 * this module owns the bytes. Keeping them apart is what lets the payload format
 * be tested without driving a whole exchange.
 */

/** What every payload asserts about the device that produced it. */
export interface IdentityFields {
  deviceId: string;
  identityJwk: JsonWebKey;
  ephemeralJwk: JsonWebKey;
}

/** A minted offer, with the derived values the initiator must keep. */
export interface MintedOffer {
  offer: PairingOffer;
  /** Canonical bytes — an input to the transcript, so they are kept, not recomputed. */
  bytes: Uint8Array;
  /** The hash the answer must bind to. */
  hash: string;
}

export interface MintedAnswer {
  answer: PairingAnswer;
  bytes: Uint8Array;
}

interface MintOptions {
  identity: DeviceIdentityKeys;
  fields: IdentityFields;
  sessionId: string;
  expiresAt: number;
  sdp: string;
  nonce: string;
}

interface MintAnswerOptions extends MintOptions {
  offerHash: string;
}

interface BindOptions {
  /** The payload the *peer* produced — whose identity this device is adopting. */
  peer: PairingPayload;
  offerBytes: Uint8Array;
  answerBytes: Uint8Array;
}

/**
 * Interfaces carry no index signature, so the signing helper — which takes an
 * arbitrary record by design — needs this conversion. It mirrors the one
 * `payloadValidation` already performs on the verifying side.
 */
const asRecord = (payload: object): Record<string, unknown> =>
  payload as unknown as Record<string, unknown>;

/**
 * A view may be backed by a `SharedArrayBuffer`, which `BufferSource` excludes,
 * so the bytes are copied into a plain buffer before they reach Web Crypto. The
 * same conversion guards `deviceSignature` and `deviceIdentity`.
 */
const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

/** SHA-256 over canonical bytes, base64url. Used for `offerHash` (§4, §9). */
export const canonicalHash = async (bytes: Uint8Array): Promise<string> =>
  toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', asBuffer(bytes))));

/** Export this device's public halves for a payload. */
export const identityFieldsFor = async (options: {
  identity: DeviceIdentityKeys;
  ephemeral: PairingEphemeralKeys;
}): Promise<IdentityFields> => ({
  deviceId: String(await deviceIdFor(options.identity.publicKey)),
  identityJwk: await publicJwkOf(options.identity.publicKey),
  ephemeralJwk: await ephemeralPublicJwkOf(options.ephemeral.publicKey),
});

export const mintOffer = async (options: MintOptions): Promise<MintedOffer> => {
  const unsigned: Omit<PairingOffer, 'signature'> = {
    v: PAIRING_PROTOCOL_VERSION,
    sessionId: options.sessionId,
    kind: 'offer',
    ...options.fields,
    sdp: options.sdp,
    nonce: options.nonce,
    expiresAt: options.expiresAt,
  };
  const offer: PairingOffer = {
    ...unsigned,
    signature: await signPairingPayload(options.identity.privateKey, asRecord(unsigned)),
  };
  const bytes = pairingPayloadBytes(offer);
  return { offer, bytes, hash: await canonicalHash(bytes) };
};

export const mintAnswer = async (options: MintAnswerOptions): Promise<MintedAnswer> => {
  const unsigned: Omit<PairingAnswer, 'signature'> = {
    v: PAIRING_PROTOCOL_VERSION,
    sessionId: options.sessionId,
    kind: 'answer',
    ...options.fields,
    sdp: options.sdp,
    nonce: options.nonce,
    expiresAt: options.expiresAt,
    offerHash: options.offerHash,
  };
  const answer: PairingAnswer = {
    ...unsigned,
    signature: await signPairingPayload(options.identity.privateKey, asRecord(unsigned)),
  };
  return { answer, bytes: pairingPayloadBytes(answer) };
};

/**
 * Bind both payloads into the transcript and derive the code the user compares.
 *
 * Two devices that saw different bytes reach different transcripts and simply
 * cannot agree — the mismatch surfaces as a code the user can see, without
 * anyone having to trust that a check was performed.
 */
export const bindTranscript = async (
  options: BindOptions,
): Promise<AuthenticatedPeerParameters> => {
  const transcript = await pairingTranscript(options.offerBytes, options.answerBytes);
  return {
    deviceId: asDeviceId(options.peer.deviceId),
    publicIdentityJwk: options.peer.identityJwk,
    transcript,
    verificationCode: await verificationCode(transcript),
  };
};
