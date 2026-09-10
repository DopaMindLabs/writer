import { fromBase64Url, toBase64Url } from './base64url';
import { canonicalJson } from './canonicalJson';

/**
 * Signing and verification of pairing payloads, specified in
 * `docs/pairing-protocol.md` §9.
 *
 * A signature here proves only *self-consistency*: that whoever holds the
 * identity key in the payload also authored the rest of it. An attacker signs
 * their own payload with their own key perfectly well. What binds the key to the
 * device the user actually means is the verification code in
 * `pairingTranscript.ts` — this module is one layer of that, not the whole of it.
 */

const SIGN_LABEL = 'lipsum-pair-sign-v1';
const SIGN_ALGORITHM = { name: 'ECDSA', hash: 'SHA-256' } as const;

/** Thrown when a payload presented for verification carries no signature. */
export class MissingSignatureError extends Error {
  constructor() {
    super('Pairing payload carries no signature');
    this.name = 'MissingSignatureError';
  }
}

const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

/**
 * The bytes actually signed: a domain label, a `0x00` separator, then the
 * canonical encoding of every field *except* the signature itself.
 *
 * The label is what stops a pairing signature being replayed as a signature over
 * something else — an operation frame, a future protocol message — since each
 * context hashes under its own prefix. Excluding `signature` is not cosmetic: it
 * is what makes the input well-defined, because the field cannot be an input to
 * the value it holds.
 */
const signingInput = (payload: Record<string, unknown>): ArrayBuffer => {
  const rest = Object.fromEntries(
    Object.entries(payload).filter(([key]) => key !== 'signature'),
  );
  const label = new TextEncoder().encode(SIGN_LABEL);
  const body = new TextEncoder().encode(canonicalJson(rest));
  const input = new Uint8Array(label.length + 1 + body.length);
  input.set(label, 0);
  input[label.length] = 0;
  input.set(body, label.length + 1);
  return asBuffer(input);
};

/** Sign a payload with this device's identity key; returns base64url. */
export const signPairingPayload = async (
  privateKey: CryptoKey,
  payload: Record<string, unknown>,
): Promise<string> => {
  const signature = await crypto.subtle.sign(
    SIGN_ALGORITHM,
    privateKey,
    signingInput(payload),
  );
  return toBase64Url(new Uint8Array(signature));
};

/**
 * Verify a payload against a peer's public key.
 *
 * Returns `false` for every cryptographic failure — a wrong key, altered fields,
 * a malformed signature — so a caller cannot accidentally distinguish them and
 * build an oracle. A *missing* signature throws instead, because that is a
 * programming error in the caller's validation order, not an attack to report.
 */
export const verifyPairingPayload = async (
  publicKey: CryptoKey,
  payload: Record<string, unknown>,
): Promise<boolean> => {
  const { signature } = payload;
  if (typeof signature !== 'string' || signature.length === 0) {
    throw new MissingSignatureError();
  }
  try {
    return await crypto.subtle.verify(
      SIGN_ALGORITHM,
      publicKey,
      asBuffer(fromBase64Url(signature)),
      signingInput(payload),
    );
  } catch {
    return false;
  }
};
