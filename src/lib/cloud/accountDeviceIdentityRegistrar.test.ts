import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import {
  generateRootSecret,
  deriveKeyRing,
  wrapRootSecret,
} from '@/lib/cloud/crypto/keys';
import {
  saveDeviceKeyRing,
  forgetDeviceKeyRing,
  deviceKeyProvider,
} from '@/lib/cloud/crypto/keyStore';
import { createEncryptionMiddleware } from '@/lib/cloud/crypto/middleware';
import { keyMismatchState } from '@/lib/cloud/crypto/keyMismatch';
import { deviceIdentityStore } from '@/lib/cloud/crypto/deviceIdentityStore';
import { CIPHER_FIELD } from '@/lib/cloud/crypto/tableRules';
import { accountDeviceIdentityId } from '@/lib/writerSyncIntegration/accountDeviceIdentity.types';
import * as accountDeviceIdentityStore from '@/lib/writerSyncIntegration/accountDeviceIdentityStore';
import {
  registerAccountIdentity,
  startAccountIdentityRegistrar,
  type AccountIdentityRegistrationDeps,
} from './accountDeviceIdentityRegistrar';

/**
 * The registrar publishes this device's signing identity to the account
 * registry — but only once the account key it would seal under is proven
 * authoritative. A device may briefly hold a locally-minted key while signing
 * into an account whose escrow wraps another; publishing then would assert an
 * identity under a key the account never authorised.
 */

const ACCOUNT = 'acct-1';
let db: LoremDB;
let master: Uint8Array;

const deps = (over: Partial<AccountIdentityRegistrationDeps> = {}): AccountIdentityRegistrationDeps => ({
  db,
  isPullComplete: () => true,
  signedInAccountId: () => ACCOUNT,
  hasKeyMismatch: () => false,
  now: () => 1723000000999,
  ...over,
});

const rawRow = (id: string): Promise<Record<string, unknown> | undefined> =>
  import('dexie').then(({ default: Dexie }) =>
    db.transaction('r', db.table('accountDeviceIdentities'), async () => {
      const tx = Dexie.currentTransaction as unknown as {
        idbtrans?: { disableBlobResolve?: boolean };
      };
      if (tx.idbtrans) tx.idbtrans.disableBlobResolve = true;
      return db.table<Record<string, unknown>>('accountDeviceIdentities').get(id);
    }),
  );

beforeEach(async () => {
  db = new LoremDB(`account-registrar-${crypto.randomUUID()}`, { cloud: true });
  db.use(createEncryptionMiddleware(deviceKeyProvider));
  await db.open();
  master = generateRootSecret();
  await saveDeviceKeyRing({ accountId: ACCOUNT, ring: await deriveKeyRing(master, 1) });
  await db.cloudCrypto.put(await wrapRootSecret(master, 'passphrase', 1000));
});

afterEach(async () => {
  keyMismatchState.set(false);
  await forgetDeviceKeyRing();
  await deviceIdentityStore.forget();
  await db.delete();
});

describe('registerAccountIdentity — eligibility gates', () => {
  it('does nothing before the initial account pull completes', async () => {
    const result = await registerAccountIdentity(deps({ isPullComplete: () => false }));
    expect(result).toBe('ineligible');
    expect(await db.table('accountDeviceIdentities').count()).toBe(0);
    // An ineligible run must not mint the device identity as a side effect.
    expect(await deviceIdentityStore.current()).toBeNull();
  });

  it('does nothing while signed out', async () => {
    expect(
      await registerAccountIdentity(deps({ signedInAccountId: () => null })),
    ).toBe('ineligible');
    expect(await db.table('accountDeviceIdentities').count()).toBe(0);
  });

  it('does nothing keyless', async () => {
    await forgetDeviceKeyRing();
    expect(await registerAccountIdentity(deps())).toBe('ineligible');
    expect(await db.table('accountDeviceIdentities').count()).toBe(0);
  });

  it('does nothing while the held ring is bound to another account', async () => {
    await saveDeviceKeyRing({
      accountId: 'someone-else',
      ring: await deriveKeyRing(master, 1),
    });
    expect(await registerAccountIdentity(deps())).toBe('ineligible');
    expect(await db.table('accountDeviceIdentities').count()).toBe(0);
  });

  it('does nothing while the account escrow has not been pulled', async () => {
    await db.cloudCrypto.clear();
    expect(await registerAccountIdentity(deps())).toBe('ineligible');
    expect(await db.table('accountDeviceIdentities').count()).toBe(0);
  });

  it('does nothing while the held ring is not the account escrow fingerprint', async () => {
    await db.cloudCrypto.clear();
    await db.cloudCrypto.put(await wrapRootSecret(generateRootSecret(), 'other', 1000));
    expect(await registerAccountIdentity(deps())).toBe('ineligible');
    expect(await db.table('accountDeviceIdentities').count()).toBe(0);
  });

  it('does nothing under an active key mismatch', async () => {
    expect(
      await registerAccountIdentity(deps({ hasKeyMismatch: () => true })),
    ).toBe('ineligible');
    expect(await db.table('accountDeviceIdentities').count()).toBe(0);
  });

  it('does nothing on a database without the registry table', async () => {
    const plain = new LoremDB(`account-registrar-plain-${crypto.randomUUID()}`);
    plain.use(createEncryptionMiddleware(deviceKeyProvider));
    await plain.open();
    expect(await registerAccountIdentity(deps({ db: plain }))).toBe('ineligible');
    await plain.delete();
  });
});

describe('registerAccountIdentity — publication', () => {
  it('publishes exactly one sealed record after authoritative unlock', async () => {
    expect(await registerAccountIdentity(deps())).toBe('published');

    const own = await deviceIdentityStore.load();
    const id = accountDeviceIdentityId(own.deviceId);
    expect(await db.table('accountDeviceIdentities').count()).toBe(1);

    // At rest: routing plaintext plus the envelope, nothing else.
    const raw = await rawRow(id);
    expect(raw?.[CIPHER_FIELD]).toBeDefined();
    expect(raw?.accessScopeId).toBe('account');
    expect(raw?.publicIdentityJwk).toBeUndefined();
    expect(raw?.deviceId).toBeUndefined();
    expect(raw?.authorisedAt).toBeUndefined();

    // Decrypted: the record names this device's real cryptographic identity —
    // and only its public half, with no private component and no extra fields.
    const record = await db.accountDeviceIdentities.get(id);
    expect(String(record?.deviceId)).toBe(String(own.deviceId));
    expect(record?.authorisedAt).toBe(1723000000999);
    expect(record?.publicIdentityJwk.d).toBeUndefined();
    expect(Object.keys(record ?? {}).sort()).toEqual(
      ['accessScopeId', 'authorisedAt', 'deviceId', 'id', 'publicIdentityJwk'].sort(),
    );
    expect(JSON.stringify(raw)).not.toContain('"d"');
  });

  it('performs no write on a repeated settled run', async () => {
    expect(await registerAccountIdentity(deps())).toBe('published');
    const own = await deviceIdentityStore.load();
    const before = await rawRow(accountDeviceIdentityId(own.deviceId));

    expect(await registerAccountIdentity(deps())).toBe('already-registered');

    // A re-seal would mint a fresh IV; byte-identical ciphertext proves no write.
    const after = await rawRow(accountDeviceIdentityId(own.deviceId));
    expect(after?.[CIPHER_FIELD]).toEqual(before?.[CIPHER_FIELD]);
  });

  it('fails closed on a conflicting record for this id and never overwrites it', async () => {
    const own = await deviceIdentityStore.load();
    const { generateDeviceIdentity, publicJwkOf } = await import('writer-sync/crypto');
    const foreign = await generateDeviceIdentity();
    const planted = {
      id: accountDeviceIdentityId(own.deviceId),
      accessScopeId: 'account',
      deviceId: String(own.deviceId),
      publicIdentityJwk: await publicJwkOf(foreign.publicKey),
      authorisedAt: 1,
    };
    await db.table('accountDeviceIdentities').put(planted);
    const before = await rawRow(planted.id);

    expect(await registerAccountIdentity(deps())).toBe('conflict');

    const after = await rawRow(planted.id);
    expect(after?.[CIPHER_FIELD]).toEqual(before?.[CIPHER_FIELD]);
  });
});

describe('registerAccountIdentity — default cloud readers', () => {
  /** The addon slice the default readers duck-type off the database. */
  interface CloudSlice {
    cloud?: {
      currentUser?: { value?: { userId?: string; isLoggedIn?: boolean } };
      persistedSyncState?: { value?: { initiallySynced?: boolean } };
    };
  }

  it('reads sign-in and pull state off the database when no gates are injected', async () => {
    // A signed-in account whose pull completed, grafted the way the addon
    // exposes it — but the ring was forgotten, so the run stops at the key
    // gate. This exercises the default duck-typed readers end to end.
    (db as CloudSlice).cloud = {
      currentUser: { value: { userId: ACCOUNT, isLoggedIn: true } },
      persistedSyncState: { value: { initiallySynced: true } },
    };
    await forgetDeviceKeyRing();

    expect(await registerAccountIdentity({ db })).toBe('ineligible');
    expect(await db.table('accountDeviceIdentities').count()).toBe(0);
  });

  it('treats a signed-out database as ineligible through the default readers', async () => {
    expect(await registerAccountIdentity({ db })).toBe('ineligible');
  });
});

describe('registerAccountIdentity — store failures', () => {
  it('propagates an unexpected store failure instead of mapping it to a result', async () => {
    const failure = new Error('quota exceeded');
    await expect(
      registerAccountIdentity(
        deps({
          store: {
            find: () => Promise.resolve(null),
            put: () => Promise.reject(failure),
          },
        }),
      ),
    ).rejects.toBe(failure);
  });
});

describe('startAccountIdentityRegistrar', () => {
  it('defaults to the real registrar run without throwing', async () => {
    const listeners: ((s: { phase: string }) => void)[] = [];
    // The default run's first eligibility gate — reaching it proves the
    // default `registerAccountIdentity` wiring executed.
    const tableGate = vi.spyOn(accountDeviceIdentityStore, 'hasAccountIdentityTable');
    const stop = startAccountIdentityRegistrar({
      syncState: {
        subscribe: (next) => {
          listeners.push(next);
          return { unsubscribe: () => undefined };
        },
      },
    });

    // The app database in this suite has no cloud schema, so the default run
    // resolves 'ineligible' — the point is that the default wiring executes.
    for (const listener of listeners) listener({ phase: 'in-sync' });
    await vi.waitFor(() => expect(tableGate).toHaveBeenCalled());
    stop();
    tableGate.mockRestore();
  });

  it('runs on the shared lifecycle signals', async () => {
    const listeners: ((s: { phase: string }) => void)[] = [];
    const run = vi.fn().mockResolvedValue('ineligible');
    const stop = startAccountIdentityRegistrar({
      syncState: {
        subscribe: (next) => {
          listeners.push(next);
          return { unsubscribe: () => undefined };
        },
      },
      run,
    });

    for (const listener of listeners) listener({ phase: 'in-sync' });
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    stop();
  });
});
