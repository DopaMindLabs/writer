import { fromBase64Url, toBase64Url } from './base64url';
import { canonicalJson } from './canonicalJson';
import type { EncryptedSyncFrame } from '../operations/operation.types';

/**
 * Device signatures over operation frames, discharging the seam left in
 * `docs/sync-frame-protocol.md` §9.
 *
 * The AAD in §3 already proves a frame's header and payload belong together —
 * but only to whoever holds the content key, which every device sharing the root
 * does. That authenticates the frame *as content*, not *to a device*: without a
 * signature, any key holder can author a frame naming another device, and a
 * removed device's own key still opens everything it ever held. The signature is
 * what makes `deviceId` a claim the receiver can check.
 *
 * ECDSA P-256 over the existing device identity key (`deviceIdentity.ts`): the
 * same algorithm pairing already relies on, native to WebCrypto, so this adds no
 * dependency and no second key to manage.
 *
 * The label differs from every pairing label in `pairing-protocol.md` §10. That
 * separation is what stops a signature captured in one context being replayed as
 * a signature in another — a pairing payload must never verify as a frame.
 */

const FRAME_SIGN_LABEL = 'lipsum-frame-sign-v1';
const SIGN_ALGORITHM = { name: 'ECDSA', hash: 'SHA-256' } as const;

/** Thrown when a frame presented for verification carries no signature. */
export class MissingFrameSignatureError extends Error {
  constructor() {
    super('Operation frame carries no signature');
    this.name = 'MissingFrameSignatureError';
  }
}

const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

/**
 * The bytes actually signed: a domain label, a `0x00` separator, then the
 * canonical encoding of every frame field *except* `signature` itself.
 *
 * `payloadHash` is included — §9 requires it — so a signature covers the
 * ciphertext by proxy without the signer having to hash it twice. `signature` is
 * excluded because a field cannot be an input to the value it holds.
 */
const signingInput = (frame: EncryptedSyncFrame): ArrayBuffer => {
  // Listed field by field rather than spread-minus-signature: the set a
  // signature covers is a security property, and it should change only when
  // someone edits this list on purpose.
  const label = new TextEncoder().encode(FRAME_SIGN_LABEL);
  const body = new TextEncoder().encode(
    canonicalJson({
      v: frame.v,
      operationId: String(frame.operationId),
      accessScopeId: frame.accessScopeId,
      entityTable: frame.entityTable,
      entityId: frame.entityId,
      kind: frame.kind,
      deviceId: String(frame.deviceId),
      logicalAt: { millis: frame.logicalAt.millis, counter: frame.logicalAt.counter },
      keyId: frame.keyId,
      epoch: frame.epoch,
      payloadHash: frame.payloadHash,
      payload: frame.payload,
    }),
  );
  const input = new Uint8Array(label.length + 1 + body.length);
  input.set(label, 0);
  input[label.length] = 0;
  input.set(body, label.length + 1);
  return asBuffer(input);
};

/** Sign a frame with this device's identity key; returns base64url. */
export const signFrame = async (
  privateKey: CryptoKey,
  frame: EncryptedSyncFrame,
): Promise<string> =>
  toBase64Url(
    new Uint8Array(await crypto.subtle.sign(SIGN_ALGORITHM, privateKey, signingInput(frame))),
  );

/**
 * Verify a frame against the originating device's public key.
 *
 * Returns `false` for every cryptographic failure — wrong key, altered field,
 * malformed signature — so a caller cannot tell them apart and build an oracle.
 * A *missing* signature throws instead: that is a validation-order mistake in the
 * caller, not an attack to report.
 */
export const verifyFrameSignature = async (
  publicKey: CryptoKey,
  frame: EncryptedSyncFrame,
): Promise<boolean> => {
  if (frame.signature.length === 0) throw new MissingFrameSignatureError();
  try {
    return await crypto.subtle.verify(
      SIGN_ALGORITHM,
      publicKey,
      asBuffer(fromBase64Url(frame.signature)),
      signingInput(frame),
    );
  } catch {
    return false;
  }
};
