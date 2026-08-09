import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import {
  generateRootSecret,
  deriveKeyRing,
  type CloudKeyRing,
} from '@/lib/cloud/crypto/keys';
import { createEncryptionMiddleware } from '@/lib/cloud/crypto/middleware';
import { CloudKeyMismatchError, CloudKeylessWriteError } from '@/lib/cloud/crypto/errors';
import { keyMismatchState } from '@/lib/cloud/crypto/keyMismatch';
import type { ScopeKeyResolver } from 'writer-sync/crypto';
import {
  deviceIdFor,
  generateDeviceIdentity,
  publicJwkOf,
} from 'writer-sync/crypto';
import type { DeviceId } from 'writer-sync/core';
import { asDeviceId } from 'writer-sync/core';
import {
  ACCOUNT_IDENTITY_SCOPE,
  accountDeviceIdentityId,
  type AccountDeviceIdentity,
} from './accountDeviceIdentity.types';
import {
  AccountIdentityConflictError,
  createAccountDeviceIdentityStore,
  hasAccountIdentityTable,
} from './accountDeviceIdentityStore';

/**
 * The registry reader is a trust boundary: everything it returns feeds frame
 * authorisation, so a record must prove — not assert — that its id belongs to
 * its key. These tests plant hostile-but-sealed rows through the raw table (the
 * state a compromised account device or a raced write could leave) and require
 * the store to refuse them without repairing or overwriting anything.
 */

let db: LoremDB;
let ring: CloudKeyRing | null = null;
const resolver: ScopeKeyResolver = {
  keyFor: () => ring,
  hasAnyKey: () => ring !== null,
};

/** A real cryptographic identity: derived id plus exported public JWK. */
const mintIdentity = async (): Promise<{
  deviceId: DeviceId;
  jwk: JsonWebKey;
}> => {
  const keys = await generateDeviceIdentity();
  return {
    deviceId: await deviceIdFor(keys.publicKey),
    jwk: await publicJwkOf(keys.publicKey),
  };
};

const recordFor = (identity: {
  deviceId: DeviceId;
  jwk: JsonWebKey;
}): AccountDeviceIdentity => ({
  id: accountDeviceIdentityId(identity.deviceId),
  accessScopeId: ACCOUNT_IDENTITY_SCOPE,
  deviceId: identity.deviceId,
  publicIdentityJwk: identity.jwk,
  authorisedAt: 1723000000000,
});

/** Plant a row through the raw table API — sealed by the middleware, but with
 *  whatever (possibly inconsistent) content the test wants stored. */
const plant = (row: Record<string, unknown>): Promise<unknown> =>
  db.table('accountDeviceIdentities').put(row);

beforeEach(async () => {
  db = new LoremDB(`account-identity-store-${crypto.randomUUID()}`, { cloud: true });
  db.use(createEncryptionMiddleware(resolver));
  await db.open();
  ring = await deriveKeyRing(generateRootSecret(), 1);
});

afterEach(async () => {
  ring = null;
  keyMismatchState.set(false);
  await db.delete();
});

describe('hasAccountIdentityTable', () => {
  it('is true on a cloud schema and false on the base schema', async () => {
    expect(hasAccountIdentityTable(db)).toBe(true);
    const plain = new LoremDB(`account-identity-plain-${crypto.randomUUID()}`);
    await plain.open();
    expect(hasAccountIdentityTable(plain)).toBe(false);
    await plain.delete();
  });
});

describe('createAccountDeviceIdentityStore — find', () => {
  it('round-trips a stored identity and returns an importable public key', async () => {
    const identity = await mintIdentity();
    const store = createAccountDeviceIdentityStore(db);
    await store.put(recordFor(identity));

    const found = await store.find(identity.deviceId);
    expect(found).not.toBeNull();
    expect(String(found?.record.deviceId)).toBe(String(identity.deviceId));
    expect(found?.record.publicIdentityJwk.x).toBe(identity.jwk.x);
    expect(found?.publicKey).toBeInstanceOf(CryptoKey);
  });

  it('returns null for a device the registry does not know', async () => {
    const store = createAccountDeviceIdentityStore(db);
    expect(await store.find((await mintIdentity()).deviceId)).toBeNull();
  });

  it('refuses a record whose JWK derives a different device id', async () => {
    const claimed = await mintIdentity();
    const other = await mintIdentity();
    // The row sits at claimed's deterministic id but carries other's key: an
    // id-to-key substitution. The derive-and-compare must refuse it.
    await plant({ ...recordFor(claimed), publicIdentityJwk: other.jwk });

    const store = createAccountDeviceIdentityStore(db);
    expect(await store.find(claimed.deviceId)).toBeNull();
  });

  it('refuses a record whose sealed deviceId disagrees with its key and id', async () => {
    const identity = await mintIdentity();
    const other = await mintIdentity();
    await plant({ ...recordFor(identity), deviceId: other.deviceId });

    const store = createAccountDeviceIdentityStore(db);
    expect(await store.find(identity.deviceId)).toBeNull();
  });

  it('refuses a record outside the account scope', async () => {
    const identity = await mintIdentity();
    await plant({ ...recordFor(identity), accessScopeId: 'space-1' });

    const store = createAccountDeviceIdentityStore(db);
    expect(await store.find(identity.deviceId)).toBeNull();
  });

  it('refuses a malformed public key without repairing it', async () => {
    const identity = await mintIdentity();
    await plant({
      ...recordFor(identity),
      publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: identity.jwk.x },
    });

    const store = createAccountDeviceIdentityStore(db);
    expect(await store.find(identity.deviceId)).toBeNull();
    // Refusal is read-only: the stored row is untouched, still missing `y`.
    const raw = await db
      .table<Record<string, unknown>>('accountDeviceIdentities')
      .get(accountDeviceIdentityId(identity.deviceId));
    expect((raw?.publicIdentityJwk as JsonWebKey).y).toBeUndefined();
  });

  it('refuses a JWK that smuggles a private component', async () => {
    const identity = await mintIdentity();
    await plant({
      ...recordFor(identity),
      publicIdentityJwk: { ...identity.jwk, d: 'private-scalar' },
    });

    const store = createAccountDeviceIdentityStore(db);
    expect(await store.find(identity.deviceId)).toBeNull();
  });

  it('finds nothing while keyless — an unreadable record authorises nothing', async () => {
    const identity = await mintIdentity();
    const store = createAccountDeviceIdentityStore(db);
    await store.put(recordFor(identity));

    ring = null;
    expect(await store.find(identity.deviceId)).toBeNull();
  });

  it('tolerates provider bookkeeping fields around a valid record', async () => {
    const identity = await mintIdentity();
    await plant({ ...recordFor(identity), realmId: 'rlm-1', owner: 'someone' });

    const store = createAccountDeviceIdentityStore(db);
    expect(await store.find(identity.deviceId)).not.toBeNull();
  });
});

describe('createAccountDeviceIdentityStore — put', () => {
  it('is idempotent for the same identity', async () => {
    const identity = await mintIdentity();
    const store = createAccountDeviceIdentityStore(db);
    await store.put(recordFor(identity));
    await expect(store.put(recordFor(identity))).resolves.toBeUndefined();

    expect(await db.table('accountDeviceIdentities').count()).toBe(1);
  });

  it('fails closed on a conflicting record and never overwrites it', async () => {
    const identity = await mintIdentity();
    const other = await mintIdentity();
    const conflicting = { ...recordFor(identity), publicIdentityJwk: other.jwk };
    await plant(conflicting);

    const store = createAccountDeviceIdentityStore(db);
    await expect(store.put(recordFor(identity))).rejects.toBeInstanceOf(
      AccountIdentityConflictError,
    );
    const raw = await db
      .table<Record<string, unknown>>('accountDeviceIdentities')
      .get(accountDeviceIdentityId(identity.deviceId));
    expect((raw?.publicIdentityJwk as JsonWebKey).x).toBe(other.jwk.x);
  });

  it('refuses to write a record whose own fields disagree', async () => {
    const identity = await mintIdentity();
    const other = await mintIdentity();
    const store = createAccountDeviceIdentityStore(db);

    await expect(
      store.put({ ...recordFor(identity), deviceId: other.deviceId }),
    ).rejects.toBeInstanceOf(AccountIdentityConflictError);
    expect(await db.table('accountDeviceIdentities').count()).toBe(0);
  });

  it('propagates the keyless write refusal', async () => {
    const identity = await mintIdentity();
    ring = null;

    const store = createAccountDeviceIdentityStore(db);
    await expect(store.put(recordFor(identity))).rejects.toBeInstanceOf(
      CloudKeylessWriteError,
    );
  });

  it('fails closed when the occupied row is unreadable under the current key', async () => {
    const identity = await mintIdentity();
    const store = createAccountDeviceIdentityStore(db);
    await store.put(recordFor(identity));

    // Another key sealed the existing row (a mismatched or hostile state): it
    // reads as absent, but the slot is occupied — never silently replaced.
    // Reading it engages the key-mismatch lock, which refuses the write before
    // the add-only constraint even has to; either refusal is fail-closed.
    ring = await deriveKeyRing(generateRootSecret(), 1);
    await expect(store.put(recordFor(identity))).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof CloudKeyMismatchError ||
        error instanceof AccountIdentityConflictError,
    );
    expect(await db.table('accountDeviceIdentities').count()).toBe(1);
  });
});

describe('createAccountDeviceIdentityStore — decrypted shape gate', () => {
  it('refuses a sealed record whose deviceId is not a string', async () => {
    const identity = await mintIdentity();
    await plant({ ...recordFor(identity), deviceId: 12345 });

    const store = createAccountDeviceIdentityStore(db);
    expect(await store.find(identity.deviceId)).toBeNull();
  });

  it('refuses a sealed record with no public key object at all', async () => {
    const identity = await mintIdentity();
    await plant({ ...recordFor(identity), publicIdentityJwk: 'not-an-object' });

    const store = createAccountDeviceIdentityStore(db);
    expect(await store.find(identity.deviceId)).toBeNull();
  });

  it('refuses a sealed record whose authorisation time is not a number', async () => {
    const identity = await mintIdentity();
    await plant({ ...recordFor(identity), authorisedAt: 'yesterday' });

    const store = createAccountDeviceIdentityStore(db);
    expect(await store.find(identity.deviceId)).toBeNull();
  });
});

describe('createAccountDeviceIdentityStore — publication races', () => {
  it('treats losing a race to an identical write as success', async () => {
    const identity = await mintIdentity();
    const store = createAccountDeviceIdentityStore(db);
    // The row is already there (the concurrent writer won), but this writer's
    // pre-check missed it and its add hits the primary-key constraint.
    await store.put(recordFor(identity));
    const constraint = Object.assign(new Error('key exists'), {
      name: 'ConstraintError',
    });
    const findSpy = vi
      .spyOn(db.accountDeviceIdentities, 'get')
      .mockResolvedValueOnce(undefined);
    const addSpy = vi
      .spyOn(db.accountDeviceIdentities, 'add')
      .mockRejectedValueOnce(constraint);

    await expect(store.put(recordFor(identity))).resolves.toBeUndefined();
    findSpy.mockRestore();
    addSpy.mockRestore();
  });

  it('fails closed when the race winner holds a different identity', async () => {
    const identity = await mintIdentity();
    const other = await mintIdentity();
    const store = createAccountDeviceIdentityStore(db);
    await plant({ ...recordFor(identity), publicIdentityJwk: other.jwk });
    const constraint = Object.assign(new Error('key exists'), {
      name: 'ConstraintError',
    });
    const findSpy = vi
      .spyOn(db.accountDeviceIdentities, 'get')
      .mockResolvedValueOnce(undefined);
    const addSpy = vi
      .spyOn(db.accountDeviceIdentities, 'add')
      .mockRejectedValueOnce(constraint);

    await expect(store.put(recordFor(identity))).rejects.toBeInstanceOf(
      AccountIdentityConflictError,
    );
    findSpy.mockRestore();
    addSpy.mockRestore();
  });
});

describe('type-level id derivation', () => {
  it('builds the deterministic account-private key', () => {
    expect(accountDeviceIdentityId(asDeviceId('abc'))).toBe('#writer-device:abc');
  });
});
