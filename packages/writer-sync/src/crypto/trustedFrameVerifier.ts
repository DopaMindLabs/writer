import { isTrustedForSession } from '../core/trustedDevice.types';
import type { TrustedDeviceRegistry } from '../core/trustedDeviceRegistry.types';
import type { EncryptedSyncFrame } from '../operations/operation.types';
import { importDevicePublicKey, sameIdentityKey } from './deviceIdentity';
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
/** An imported key, kept beside the JWK it was imported from. */
interface CachedIdentity {
  jwk: JsonWebKey;
  key: CryptoKey;
}

export const createTrustedFrameVerifier = (
  registry: TrustedDeviceRegistry,
): ((frame: EncryptedSyncFrame) => Promise<boolean>) => {
  // Imported keys are cached per device: re-importing a JWK for every inbound
  // frame turns a catch-up batch into thousands of redundant key imports. Only
  // the *import* is cached — the trust decision is not, so the cache can never
  // vouch for a device the registry has stopped vouching for.
  const identities = new Map<string, CachedIdentity>();

  return async (frame) => {
    // An unsigned frame is refused here rather than allowed to throw: Stage 1
    // wrote empty signatures, so this is reachable with ordinary old data and is
    // a rejection, not a programming error.
    if (frame.signature.length === 0) return false;

    // Trust is read for every frame. A device removed while a session is open
    // must stop being believed on the next frame rather than at the next
    // reconnection — the removal is the user ending the relationship, and a
    // session that outlived it would keep taking that device's writing.
    const record = await registry.find(frame.deviceId);
    if (!isTrustedForSession(record)) return false;

    const deviceId = String(frame.deviceId);
    const cached = identities.get(deviceId);
    // A re-paired device may present a different identity, so the cache is only
    // usable while it still matches what the registry holds.
    if (cached !== undefined && sameIdentityKey(cached.jwk, record.publicIdentityJwk)) {
      return verifyFrameSignature(cached.key, frame);
    }

    try {
      const key = await importDevicePublicKey(record.publicIdentityJwk);
      identities.set(deviceId, { jwk: record.publicIdentityJwk, key });
      return await verifyFrameSignature(key, frame);
    } catch {
      // A malformed stored key is a refusal, not a crash: the frame simply
      // cannot be attributed.
      return false;
    }
  };
};
