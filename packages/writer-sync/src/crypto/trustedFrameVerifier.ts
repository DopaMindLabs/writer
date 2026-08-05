import { isTrustedForSession } from '../core/trustedDevice.types';
import type { TrustedDeviceRegistry } from '../core/trustedDeviceRegistry.types';
import type { EncryptedSyncFrame } from '../operations/operation.types';
import { importDevicePublicKey } from './deviceIdentity';
import { verifyFrameSignature } from './frameSignature';

/**
 * The frame verifier a peer session installs: a signature is only meaningful
 * once it is checked against a key the registry vouches for, so possession of a
 * valid signature and trust in the signer are decided together here rather than
 * left to each call site to remember.
 *
 * `docs/sync-frame-protocol.md` §9 fixes the rules this implements — a frame
 * from a device that is unknown, removed or revoked is refused and never
 * journalled, because journalling it would let a removed device keep filling the
 * journal — and verification happens after structural and payload-hash
 * validation and before any decryption, which the exchange's ordering enforces.
 *
 * **Consequence worth stating.** Refusing unknown origins means a device only
 * accepts operations authored by devices it has itself paired with. Where A–B
 * and B–C are paired but A–C are not, B cannot relay A's operations onward to C.
 * That is the specified behaviour and the conservative one; widening it needs a
 * way for C to learn A's identity key that does not amount to B vouching for it.
 */
export const createTrustedFrameVerifier = (
  registry: TrustedDeviceRegistry,
): ((frame: EncryptedSyncFrame) => Promise<boolean>) => {
  // Imported keys are cached per device: verification runs once per inbound
  // frame, and re-importing a JWK for each one turns a catch-up batch into
  // thousands of redundant key imports.
  const keys = new Map<string, CryptoKey>();

  return async (frame) => {
    // An unsigned frame is refused here rather than allowed to throw: Stage 1
    // wrote empty signatures, so this is reachable with ordinary old data and is
    // a rejection, not a programming error.
    if (frame.signature.length === 0) return false;

    const deviceId = String(frame.deviceId);
    const cached = keys.get(deviceId);
    if (cached !== undefined) return verifyFrameSignature(cached, frame);

    const record = await registry.find(frame.deviceId);
    if (!isTrustedForSession(record)) return false;

    try {
      const key = await importDevicePublicKey(record.publicIdentityJwk);
      keys.set(deviceId, key);
      return await verifyFrameSignature(key, frame);
    } catch {
      // A malformed stored key is a refusal, not a crash: the frame simply
      // cannot be attributed.
      return false;
    }
  };
};
