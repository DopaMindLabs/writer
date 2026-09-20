import { createTrustedFrameVerifier, verifyFrameSignature } from 'writer-sync/crypto';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import type { LoremDB } from '@/db/LoremDB';
import { deviceIdentityStore } from '@/lib/cloud/crypto/deviceIdentityStore';
import { createTrustedDeviceStore } from '@/lib/writerSyncIntegration/trustedDeviceStore';

/**
 * Whether this device will accept an operation as authentically authored.
 *
 * Two devices can vouch for a frame: a peer this device has paired with, whose
 * identity key the trust registry holds, and this device itself. The second is
 * not a concession — a frame the journal holds from this device is checked
 * against this device's own public key, so a provider that forges one under our
 * device id fails exactly as it would under anyone else's.
 *
 * Everything else is refused: a provider is a bearer, and a frame it replicated
 * into `syncOperations` has had nothing but structure and a payload hash checked
 * before it reaches here. Where A–B and B–C are paired but A–C are not, C
 * refuses A's operations however they arrive; widening that needs an
 * authenticated way for C to learn A's identity key, not a weaker boundary.
 */
export type FrameVerifier = (frame: EncryptedSyncFrame) => Promise<boolean>;

export const createWriterFrameVerifier = (db: LoremDB): FrameVerifier => {
  // One verifier per ingestion pass, so the registry's imported-key cache spans
  // the whole batch rather than being rebuilt per frame.
  const trusted = createTrustedFrameVerifier(createTrustedDeviceStore(db));

  return async (frame) => {
    if (frame.signature.length === 0) return false;
    // Asked for, never created: a device that has authored nothing has no
    // identity to compare against, and reading one must not mint it.
    const own = await deviceIdentityStore.current();
    if (own !== null && String(frame.deviceId) === String(own.deviceId)) {
      return verifyFrameSignature(own.keys.publicKey, frame);
    }
    return trusted(frame);
  };
};
