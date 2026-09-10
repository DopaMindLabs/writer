import type { LoremDB } from '@/db/LoremDB';
import { asDeviceId, type DeviceId } from 'writer-sync/core';
import {
  MalformedDeviceKeyError,
  deviceIdFor,
  importDevicePublicKey,
  sameIdentityKey,
} from 'writer-sync/crypto';
import {
  ACCOUNT_IDENTITY_SCOPE,
  accountDeviceIdentityId,
  type AccountDeviceIdentity,
} from './accountDeviceIdentity.types';

/**
 * Writer's account device identity registry — the reader is a trust boundary.
 *
 * A record feeds frame authorisation, so nothing it asserts is believed: the
 * store looks up only the deterministic id for the *claimed* device id, then
 * re-derives that id from the record's own public key and requires the derived
 * id, the sealed `deviceId`, the primary key and the claim to agree. A record
 * that cannot prove itself is refused — never repaired, never overwritten
 * while verifying. This keeps the engine's invariant that a {@link DeviceId}
 * is derived from the signing key rather than asserted by whoever wrote a row.
 */

/** Thrown when the registry would have to overwrite or accept a record whose
 *  cryptographic identity disagrees with what is already proven or stored. */
export class AccountIdentityConflictError extends Error {
  constructor() {
    super(
      'account device identity registry holds a conflicting record for this id',
    );
    this.name = 'AccountIdentityConflictError';
  }
}

/** A record that passed the derive-and-compare check, with its imported key. */
export interface ValidatedAccountIdentity {
  record: AccountDeviceIdentity;
  publicKey: CryptoKey;
}

export interface AccountDeviceIdentityStore {
  /** The proven identity for a claimed device id, or `null` when the registry
   *  holds nothing readable and provable for it. */
  find(deviceId: DeviceId): Promise<ValidatedAccountIdentity | null>;
  /** Publish this device's identity — add-only and idempotent; a conflicting
   *  or unreadable occupant fails closed with {@link AccountIdentityConflictError}. */
  put(record: AccountDeviceIdentity): Promise<void>;
}

/** Whether this database declares the cloud-only registry table at all —
 *  a P2P-only Writer does not, and every consumer must keep working then. */
export const hasAccountIdentityTable = (db: LoremDB): boolean =>
  db.tables.some((table) => table.name === 'accountDeviceIdentities');

/** Structural shape of a decrypted row, before any cryptographic check. */
const shapeOf = (row: unknown): AccountDeviceIdentity | null => {
  if (typeof row !== 'object' || row === null) return null;
  const raw = row as Record<string, unknown>;
  if (typeof raw.id !== 'string') return null;
  if (raw.accessScopeId !== ACCOUNT_IDENTITY_SCOPE) return null;
  if (typeof raw.deviceId !== 'string') return null;
  if (typeof raw.publicIdentityJwk !== 'object' || raw.publicIdentityJwk === null) {
    return null;
  }
  if (typeof raw.authorisedAt !== 'number') return null;
  return {
    id: raw.id,
    accessScopeId: ACCOUNT_IDENTITY_SCOPE,
    deviceId: asDeviceId(raw.deviceId),
    publicIdentityJwk: raw.publicIdentityJwk,
    authorisedAt: raw.authorisedAt,
  };
};

/**
 * The derive-and-compare gate: import the record's key (validating, never
 * repairing), re-derive the device id from it, and require every name for the
 * identity — the claim, the primary key, the sealed field and the derivation —
 * to agree. Malformed keys are a refusal, not a crash.
 */
const validated = async (
  row: unknown,
  claimed: DeviceId,
): Promise<ValidatedAccountIdentity | null> => {
  const record = shapeOf(row);
  if (!record) return null;
  if (record.id !== accountDeviceIdentityId(claimed)) return null;
  if (String(record.deviceId) !== String(claimed)) return null;
  try {
    const publicKey = await importDevicePublicKey(record.publicIdentityJwk);
    const derived = await deviceIdFor(publicKey);
    if (String(derived) !== String(claimed)) return null;
    return { record: { ...record, deviceId: derived }, publicKey };
  } catch (error) {
    if (error instanceof MalformedDeviceKeyError) return null;
    throw error;
  }
};

/** Whether a Dexie rejection is the primary-key constraint violation. */
const isConstraintError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'ConstraintError';

export const createAccountDeviceIdentityStore = (
  db: LoremDB,
): AccountDeviceIdentityStore => {
  const find = async (
    deviceId: DeviceId,
  ): Promise<ValidatedAccountIdentity | null> => {
    const row = await db.accountDeviceIdentities.get(
      accountDeviceIdentityId(deviceId),
    );
    if (row === undefined) return null;
    return validated(row, deviceId);
  };

  return {
    find,

    put: async (record) => {
      // The writer proves its own record the same way a reader would — a
      // registrar bug must not be able to publish an id its key cannot derive.
      const proven = await validated(record, record.deviceId);
      if (!proven) throw new AccountIdentityConflictError();

      const existing = await find(record.deviceId);
      if (existing) {
        if (sameIdentityKey(existing.record.publicIdentityJwk, record.publicIdentityJwk)) {
          return; // already published — no write, so no sync feedback loop
        }
        throw new AccountIdentityConflictError();
      }
      try {
        // Add-only: an occupant that reads as absent (sealed under a key this
        // device does not hold) still rejects the add, so an unreadable record
        // is never silently replaced.
        await db.accountDeviceIdentities.add(record);
      } catch (error) {
        if (!isConstraintError(error)) throw error;
        const raced = await find(record.deviceId);
        if (
          raced &&
          sameIdentityKey(raced.record.publicIdentityJwk, record.publicIdentityJwk)
        ) {
          return; // lost a race to an identical write — already correct
        }
        throw new AccountIdentityConflictError();
      }
    },
  };
};
