import { deviceIdFor, importDevicePublicKey } from '../crypto/deviceIdentity';
import { verifyPairingPayload } from '../crypto/deviceSignature';
import {
  PairingError,
  PairingErrorCode,
  type PairingPayload,
} from './pairing.types';
import { MAX_CLOCK_SKEW_MILLIS, type ReplayCache } from './replayCache';

/**
 * The ordered acceptance checks for an inbound pairing payload, specified in
 * `docs/pairing-protocol.md` §7 and §9.
 *
 * The order is the point, not an implementation detail. Cheap structural checks
 * come before cryptography so a malformed scan costs nothing; the nonce is
 * claimed before the payload is acted on so a duplicate racing the original
 * loses; and the peer's device id is derived from its key and compared *before*
 * the signature is verified, so a payload can never assert an identity its key
 * does not produce.
 *
 * A payload that passes here is self-consistent and fresh. It is **not** yet
 * known to come from the device the user intends — that is what the verification
 * code and explicit confirmation establish.
 */

// Five minutes, the protocol's own ceiling. Two minutes proved too short for
// the camera-free path a phone actually takes — photograph the code, open the
// gallery, copy the decoded text, switch apps, paste — which routinely outlived
// the code it was carrying. The one-attempt property (§8.2) rests on the
// single-use session and the nonce cache, not on the window's length.
export const SESSION_TTL_MILLIS = 300_000;
export const MAX_SESSION_TTL_MILLIS = 300_000;

export interface ValidatePayloadOptions {
  payload: PairingPayload;
  /** The session in progress; an answer must echo the offer's id. */
  expectedSessionId: string;
  replayCache: ReplayCache;
  now: number;
  /** Required for an answer: the hash of the offer this device actually sent. */
  expectedOfferHash?: string;
}

const checkSession = (payload: PairingPayload, expected: string): void => {
  if (payload.sessionId !== expected) {
    throw new PairingError(PairingErrorCode.SessionMismatch, 'session id does not match');
  }
};

/**
 * Expiry is absolute and evaluated against a supplied clock. A payload appearing
 * to come from the future by more than the skew allowance is rejected rather
 * than accepted optimistically — the two devices are metres apart, so a minute
 * of tolerance is already generous.
 */
const checkFreshness = (payload: PairingPayload, now: number): void => {
  if (payload.expiresAt <= now) {
    throw new PairingError(PairingErrorCode.Expired, 'payload has expired');
  }
  if (payload.expiresAt > now + MAX_SESSION_TTL_MILLIS + MAX_CLOCK_SKEW_MILLIS) {
    throw new PairingError(PairingErrorCode.Expired, 'expiry is implausibly far ahead');
  }
};

const checkOfferHash = (payload: PairingPayload, expected: string | undefined): void => {
  if (payload.kind !== 'answer') return;
  if (expected === undefined) {
    throw new PairingError(
      PairingErrorCode.TranscriptMismatch,
      'an answer needs the offer hash to check against',
    );
  }
  if (payload.offerHash !== expected) {
    throw new PairingError(
      PairingErrorCode.TranscriptMismatch,
      'the answer binds to a different offer',
    );
  }
};

/**
 * Run every acceptance check. Resolves with the peer's imported public identity
 * key — the caller needs it for the trusted-device record and for nothing else
 * to have to re-import it.
 */
export const validateInboundPayload = async (
  options: ValidatePayloadOptions,
): Promise<CryptoKey> => {
  const { payload, expectedSessionId, replayCache, now, expectedOfferHash } = options;

  // Version is not re-checked here: `decodePairingPayload` is the only way to
  // obtain a `PairingPayload`, and it rejects any other version outright.
  checkSession(payload, expectedSessionId);
  checkFreshness(payload, now);
  checkOfferHash(payload, expectedOfferHash);

  // Claim the nonce before anything acts on the payload.
  replayCache.admit({
    nonce: payload.nonce,
    sessionId: payload.sessionId,
    expiresAt: payload.expiresAt,
  });

  const publicKey = await importDevicePublicKey(payload.identityJwk);
  const derived = await deviceIdFor(publicKey);
  if (String(derived) !== payload.deviceId) {
    throw new PairingError(
      PairingErrorCode.IdentityMismatch,
      'device id is not the one its key derives',
    );
  }

  const signed = await verifyPairingPayload(publicKey, payload as unknown as Record<string, unknown>);
  if (!signed) {
    throw new PairingError(PairingErrorCode.BadSignature, 'signature does not verify');
  }
  return publicKey;
};
