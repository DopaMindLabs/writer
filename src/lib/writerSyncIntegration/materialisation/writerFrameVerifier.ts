import {
  importDevicePublicKey,
  sameIdentityKey,
  verifyFrameSignature,
} from 'writer-sync/crypto';
import { isTrustedForSession, type DeviceId } from 'writer-sync/core';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import type { LoremDB } from '@/db/LoremDB';
import { deviceIdentityStore } from '@/lib/cloud/crypto/deviceIdentityStore';
import { createTrustedDeviceStore } from '@/lib/writerSyncIntegration/trustedDeviceStore';
import {
  createAccountDeviceIdentityStore,
  hasAccountIdentityTable,
} from '@/lib/writerSyncIntegration/accountDeviceIdentityStore';

/**
 * Whether this device will accept an operation as authentically authored.
 *
 * Three identity sources can vouch for a frame, all authenticated, none of
 * them a provider: this device itself (its own key), a QR-paired peer (the
 * local `trustedDevices` registry), and a same-cloud-account device (the
 * row-envelope-encrypted account identity registry, readable only under the
 * account content key — which is what proves an account-key holder authorised
 * it). Provider provenance is deliberately not an input: a frame the provider
 * replicated into `syncOperations` has had nothing but structure and a payload
 * hash checked before it reaches here, and "the provider delivered it" or "the
 * payload decrypts" must never become proof of authorship.
 *
 * When more than one source resolves the same device id, their public identity
 * must agree. A disagreement is an integrity failure and fails closed — trying
 * each key until one signature verifies would make the inconsistency
 * invisible. Where A–B and B–C are paired but A–C share neither pairing nor
 * account, C still refuses A's operations however they arrive.
 */
export type FrameVerifier = (frame: EncryptedSyncFrame) => Promise<boolean>;

/** What one device id resolved to across the trust sources; `null` = refuse. */
interface ResolvedTrust {
  key: CryptoKey | null;
}

export const createWriterFrameVerifier = (db: LoremDB): FrameVerifier => {
  const paired = createTrustedDeviceStore(db);
  // The registry table exists only on a cloud-enabled database; a P2P-only
  // Writer simply has no account source.
  const account = hasAccountIdentityTable(db)
    ? createAccountDeviceIdentityStore(db)
    : null;
  // One verifier is built per ingestion sweep, and trust is resolved once per
  // device within it — negatives included, so a journal full of frames from a
  // not-yet-authorised device costs one lookup per source, not one per frame.
  // The memo dies with the verifier: an identity row that replicates later is
  // seen by the next sweep, never shadowed by a permanent negative cache.
  const memo = new Map<string, ResolvedTrust>();

  const resolveTrust = async (deviceId: DeviceId): Promise<ResolvedTrust> => {
    const record = await paired.find(deviceId);
    const accountIdentity = account ? await account.find(deviceId) : null;
    // Two sources naming one id under two keys is an integrity failure, and it
    // is checked against the *stored* pairing identity whatever its status — a
    // revoked pairing still names a key this id is known by.
    if (
      record !== null &&
      accountIdentity !== null &&
      !sameIdentityKey(record.publicIdentityJwk, accountIdentity.record.publicIdentityJwk)
    ) {
      return { key: null };
    }
    if (isTrustedForSession(record)) {
      try {
        return { key: await importDevicePublicKey(record.publicIdentityJwk) };
      } catch {
        // A malformed stored pairing key is a refusal, not a crash — and not a
        // licence to fall through to another source for the same id.
        return { key: null };
      }
    }
    return { key: accountIdentity?.publicKey ?? null };
  };

  const trustFor = async (deviceId: DeviceId): Promise<ResolvedTrust> => {
    const id = String(deviceId);
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    const resolved = await resolveTrust(deviceId);
    memo.set(id, resolved);
    return resolved;
  };

  return async (frame) => {
    // An unsigned frame is refused here rather than allowed to throw: Stage 1
    // wrote empty signatures, so this is reachable with ordinary old data.
    if (frame.signature.length === 0) return false;
    // Asked for, never created: a device that has authored nothing has no
    // identity to compare against, and reading one must not mint it.
    const own = await deviceIdentityStore.current();
    if (own !== null && String(frame.deviceId) === String(own.deviceId)) {
      return verifyFrameSignature(own.keys.publicKey, frame);
    }
    const trust = await trustFor(frame.deviceId);
    if (trust.key === null) return false;
    return verifyFrameSignature(trust.key, frame);
  };
};
