import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import dexieCloud from 'dexie-cloud-addon';
import { LoremDB } from '@/db/LoremDB';
import { createEncryptionMiddleware } from './crypto/middleware';
import {
  deviceKeyProvider,
  saveDeviceKeyRing,
  forgetDeviceKeyRing,
  loadPendingEscrow,
  clearPendingEscrow,
} from './crypto/keyStore';
import { CIPHER_FIELD } from './crypto/tableRules';
import {
  generateMasterSecret,
  deriveKeyRing,
  wrapMasterSecret,
  unwrapMasterSecret,
  WrongPassphraseError,
  ESCROW_ID,
} from './crypto/keys';
import { EscrowMissingError } from './crypto/errors';
import { keyMismatchState } from './crypto/keyMismatch';
import { encodeRecoveryCode } from './crypto/recoveryCode';
import { EnvelopeIntegrityError } from './crypto/envelope';
import {
  createCloudEncryption,
  unlockCloudEncryption,
  recoverCloudEncryption,
  sealExistingRows,
  hasPlaintextSyncedRows,
  forgetThisDevice,
  publishPendingEscrow,
  adoptAccountKey,
  eraseSyncedContent,
} from './setup';

// Correctness is independent of the iteration count; use a small one so the
// PBKDF2 wrap/unwrap in these tests stays fast.
vi.mock('./crypto/keys', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./crypto/keys')>();
  return { ...actual, calibrateIterations: () => Promise.resolve(1000) };
});

const UNSYNCED = [
  'settings', 'backups', 'syncs', 'syncConfigs',
  'docInspectorConfigs', 'meta', 'docUpdates',
];
type Row = Record<string, unknown>;

let db: LoremDB;

const build = (name: string): LoremDB => {
  const d = new LoremDB(name, { addons: [dexieCloud], cloud: true });
  d.cloud.configure({
    databaseUrl: 'https://unset.example.invalid',
    requireAuth: false,
    disableWebSocket: true,
    disableEagerSync: true,
    unsyncedTables: UNSYNCED,
  });
  d.use(createEncryptionMiddleware(deviceKeyProvider));
  return d;
};

/** Read a row past the middleware without decrypting, then restore the key. */
const readRaw = async (table: string, key: string): Promise<Row | undefined> => {
  const ring = deviceKeyProvider.current();
  const accountId = deviceKeyProvider.accountId();
  await forgetDeviceKeyRing();
  try {
    return await db.table<Row>(table).get(key);
  } finally {
    if (ring) await saveDeviceKeyRing({ accountId, ring });
  }
};

beforeEach(async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline (test)'));
  vi.stubGlobal('WebSocket', class {
    close() {}
    addEventListener() {}
    removeEventListener() {}
    send() {}
  });
  await forgetDeviceKeyRing();
  db = build('cloud-setup-test');
  await db.open();
});

afterEach(async () => {
  keyMismatchState.set(false);
  await forgetDeviceKeyRing();
  await clearPendingEscrow();
  await db.delete();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('cloud setup', () => {
  it('holds the escrow on the device until published, and the code recovers the key', async () => {
    const code = await createCloudEncryption('correct horse battery', db);
    // Deferred publication: the escrow waits on the device, not in the synced table.
    expect(await db.cloudCrypto.toArray()).toHaveLength(0);
    expect(await loadPendingEscrow()).not.toBeNull();
    expect(code).toMatch(/^[0-9A-Z-]+$/);

    await publishPendingEscrow(db);
    const escrows = await db.cloudCrypto.toArray();
    expect(escrows).toHaveLength(1);
    expect(escrows[0].id).toBe(ESCROW_ID);
    expect(await loadPendingEscrow()).toBeNull();

    // Round-trips: recovering from the code on a fresh device yields a usable key.
    await forgetThisDevice();
    await recoverCloudEncryption(code, db);
    expect(deviceKeyProvider.current()).not.toBeNull();
  });

  it('publishPendingEscrow keeps a foreign account escrow and retains the pending one', async () => {
    // A different device's account key already occupies the row. Add-only publish
    // must never overwrite it, and must keep our escrow pending for adoption.
    const foreign = await wrapMasterSecret(generateMasterSecret(), 'other', 1000);
    await db.cloudCrypto.put(foreign);
    await createCloudEncryption('mine', db, () => 'acct-a'); // signed in: keep the row

    expect(await publishPendingEscrow(db, 'acct-a')).toBe('kept-server');
    const stored = await db.cloudCrypto.get(ESCROW_ID);
    expect(Array.from(stored?.fingerprint ?? [])).toEqual(
      Array.from(foreign.fingerprint),
    );
    expect(await loadPendingEscrow()).not.toBeNull();
  });

  it('publishPendingEscrow publishes over a row with an identical fingerprint', async () => {
    await createCloudEncryption('mine', db, () => 'acct-a');
    const ours = await loadPendingEscrow();
    if (!ours) throw new Error('expected a pending escrow');
    await db.cloudCrypto.put(ours.escrow); // server already holds our fingerprint

    expect(await publishPendingEscrow(db, 'acct-a')).toBe('published');
    expect(await loadPendingEscrow()).toBeNull();
  });

  it('refuses to publish an escrow bound to a different account', async () => {
    // Pending minted for account A must never become account B's key.
    await createCloudEncryption('mine', db, () => 'acct-a');
    expect(await publishPendingEscrow(db, 'acct-b')).toBe('none');
    // Nothing was written to the account, and the pending copy is retained.
    expect(await db.cloudCrypto.get(ESCROW_ID)).toBeUndefined();
    expect(await loadPendingEscrow()).not.toBeNull();
  });

  it('publishPendingEscrow is a no-op when nothing is pending', async () => {
    expect(await publishPendingEscrow(db)).toBe('none');
  });

  it('hasPlaintextSyncedRows sees unsealed rows and ignores sealed ones', async () => {
    expect(await hasPlaintextSyncedRows(db)).toBe(false);

    // Written while keyless — plaintext at rest.
    await forgetThisDevice();
    await db.table<Row>('docs').put({
      id: 'p', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'plain',
    });
    expect(await hasPlaintextSyncedRows(db)).toBe(true);

    // Setting up encryption seals it, so no plaintext synced rows remain.
    await createCloudEncryption('pw', db);
    expect(await hasPlaintextSyncedRows(db)).toBe(false);
  });

  it('clears a residual local escrow when setting up while signed out', async () => {
    // Residue from an earlier local session: a foreign escrow left in the local
    // database. A signed-out fresh setup must drop it, so the reconciler cannot
    // later read its stale fingerprint and lock the device out.
    await db.cloudCrypto.put(await wrapMasterSecret(generateMasterSecret(), 'x', 1000));
    await createCloudEncryption('pw', db); // default: signed out
    expect(await db.cloudCrypto.toArray()).toHaveLength(0);
  });

  it('keeps the account escrow when setting up while signed in', async () => {
    // Signed in, the local escrow is the account's real key — it must survive so
    // the mismatch/adopt flow can resolve against it.
    await db.cloudCrypto.put(await wrapMasterSecret(generateMasterSecret(), 'x', 1000));
    await createCloudEncryption('pw', db, () => 'acct-a');
    expect(await db.cloudCrypto.toArray()).toHaveLength(1);
  });

  it('binds the ring and pending escrow to null when set up while signed out', async () => {
    await createCloudEncryption('pw', db); // default: signed out
    expect(deviceKeyProvider.accountId()).toBeNull();
    expect((await loadPendingEscrow())?.accountId).toBeNull();
  });

  it('binds the ring and pending escrow to the account when set up while signed in', async () => {
    await createCloudEncryption('pw', db, () => 'acct-a');
    expect(deviceKeyProvider.accountId()).toBe('acct-a');
    expect((await loadPendingEscrow())?.accountId).toBe('acct-a');
  });

  it('unlock with the right passphrase loads a usable ring', async () => {
    await createCloudEncryption('pw', db);
    await publishPendingEscrow(db);
    await forgetThisDevice();
    expect(deviceKeyProvider.current()).toBeNull();

    await unlockCloudEncryption('pw', db);
    expect(deviceKeyProvider.current()).not.toBeNull();
    await db.table<Row>('docs').put({
      id: 'd', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'hi',
    });
    const doc = await db.table<Row>('docs').get('d');
    expect(doc?.name).toBe('hi');
  });

  it('wrong passphrase leaves the device keyless', async () => {
    await createCloudEncryption('right', db);
    await publishPendingEscrow(db);
    await forgetThisDevice();
    await expect(unlockCloudEncryption('wrong', db)).rejects.toBeInstanceOf(
      WrongPassphraseError,
    );
    expect(deviceKeyProvider.current()).toBeNull();
  });

  it('unlocking before an escrow has arrived throws EscrowMissingError, not a wrong-passphrase', async () => {
    // A fresh device with no published/pulled escrow — the catch-22 the second
    // device hits when it tries the account passphrase before signing in.
    expect(await db.cloudCrypto.get(ESCROW_ID)).toBeUndefined();
    await expect(unlockCloudEncryption('anything', db)).rejects.toBeInstanceOf(
      EscrowMissingError,
    );
  });

  it('seals every synced row and is idempotent', async () => {
    // Written before any key exists, so plaintext at rest.
    await db.table<Row>('docs').put({
      id: 'd1', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'A',
    });
    await db.table<Row>('notes').put({
      id: 'n1', spaceId: 's', kind: 'text', createdAt: 1, title: 'B',
    });

    await createCloudEncryption('pw', db);
    const rawDoc = await readRaw('docs', 'd1');
    expect(rawDoc?.[CIPHER_FIELD]).toBeDefined();
    expect(rawDoc?.name).toBeUndefined();

    // Running again must not corrupt already-sealed rows.
    await sealExistingRows(db);
    expect((await db.table<Row>('docs').get('d1'))?.name).toBe('A');
    expect((await db.table<Row>('notes').get('n1'))?.title).toBe('B');
  });

  it('rows created keyless become ciphertext after unlock+seal', async () => {
    await createCloudEncryption('pw', db);
    await publishPendingEscrow(db);
    await forgetThisDevice();
    // Keyless write: the middleware passes it through as plaintext.
    await db.table<Row>('notes').put({
      id: 'n2', spaceId: 's', kind: 'text', createdAt: 1, title: 'LATER',
    });
    expect((await db.table<Row>('notes').get('n2'))?.title).toBe('LATER');

    await unlockCloudEncryption('pw', db);
    const raw = await readRaw('notes', 'n2');
    expect(raw?.[CIPHER_FIELD]).toBeDefined();
    expect(raw?.title).toBeUndefined();
  });

  it('forgetThisDevice removes the ring but not the published escrow', async () => {
    await createCloudEncryption('pw', db);
    await publishPendingEscrow(db);
    expect(deviceKeyProvider.current()).not.toBeNull();

    await forgetThisDevice();
    expect(deviceKeyProvider.current()).toBeNull();
    expect(await db.cloudCrypto.get(ESCROW_ID)).toBeDefined();
  });

  it('rejects a wrong recovery code and stays keyless', async () => {
    await createCloudEncryption('pw', db);
    await db.table<Row>('docs').put({
      id: 'd', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'X',
    });
    await forgetThisDevice();

    const wrong = encodeRecoveryCode(generateMasterSecret());
    await expect(recoverCloudEncryption(wrong, db)).rejects.toBeInstanceOf(
      EnvelopeIntegrityError,
    );
    expect(deviceKeyProvider.current()).toBeNull();
  });

  it('rejects a foreign recovery code on an account with an escrow but no sealed rows', async () => {
    await createCloudEncryption('pw', db);
    await publishPendingEscrow(db); // escrow on the server, our fingerprint
    await forgetThisDevice();
    expect(await db.cloudCrypto.get(ESCROW_ID)).toBeDefined();

    const foreign = encodeRecoveryCode(generateMasterSecret());
    await expect(recoverCloudEncryption(foreign, db)).rejects.toBeInstanceOf(
      EnvelopeIntegrityError,
    );
    expect(deviceKeyProvider.current()).toBeNull();
  });

  it('recovers with the matching code on an account with an escrow but no sealed rows', async () => {
    const code = await createCloudEncryption('pw', db);
    await publishPendingEscrow(db);
    await forgetThisDevice();

    await recoverCloudEncryption(code, db);
    expect(deviceKeyProvider.current()).not.toBeNull();
  });
});

describe('cloud key conflict resolution', () => {
  const FAST = 1000;

  /** Seed an account whose data (`acc`) and escrow are protected by their own
   *  master, then have this device set up its *own* key and write its own note
   *  (`mine`) — the exact mismatch a wiped device hits when it re-signs-in. */
  const seedMismatch = async (): Promise<Uint8Array> => {
    // Signed into account 'acct-a', so setup binds to it and the erase/adopt flows
    // read the same account back when they publish the device's escrow.
    (
      db as unknown as {
        cloud: { currentUser: { value: { isLoggedIn: boolean; userId: string } } };
      }
    ).cloud.currentUser = { value: { isLoggedIn: true, userId: 'acct-a' } };
    const accountMaster = generateMasterSecret();
    await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(accountMaster, 1) });
    await db.table<Row>('docs').put({
      id: 'acc', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'account note',
    });
    await db.cloudCrypto.put(await wrapMasterSecret(accountMaster, 'old-pass', FAST));
    // Re-signing-in: signed into the account, so the account escrow is kept.
    await createCloudEncryption('new-pass', db, () => 'acct-a');
    await db.table<Row>('docs').put({
      id: 'mine', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'my note',
    });
    keyMismatchState.set(true);
    return accountMaster;
  };

  it('adoptAccountKey unlocks the account data and keeps this device under one passphrase', async () => {
    const accountMaster = await seedMismatch();

    await adoptAccountKey('old-pass', 'new-pass', db);

    expect(keyMismatchState.current()).toBe(false);
    expect((await db.table<Row>('docs').get('acc'))?.name).toBe('account note');
    expect((await db.table<Row>('docs').get('mine'))?.name).toBe('my note');
    const escrow = await db.cloudCrypto.get(ESCROW_ID);
    if (!escrow) throw new Error('expected an escrow after adoption');
    const recovered = await unwrapMasterSecret(escrow, 'new-pass');
    expect(Array.from(recovered)).toEqual(Array.from(accountMaster));
  });

  it('adoptAccountKey rejects the wrong account passphrase and stays mismatched', async () => {
    await seedMismatch();
    await expect(adoptAccountKey('nope', 'new-pass', db)).rejects.toBeInstanceOf(
      WrongPassphraseError,
    );
    expect(keyMismatchState.current()).toBe(true);
  });

  it('eraseSyncedContent drops unreadable account rows, keeps this device, publishes its escrow', async () => {
    const accountMaster = await seedMismatch();

    await eraseSyncedContent(db);

    expect(keyMismatchState.current()).toBe(false);
    expect(await db.table<Row>('docs').get('acc')).toBeUndefined();
    expect((await db.table<Row>('docs').get('mine'))?.name).toBe('my note');
    const escrow = await db.cloudCrypto.get(ESCROW_ID);
    if (!escrow) throw new Error('expected the device escrow to be published');
    const recovered = await unwrapMasterSecret(escrow, 'new-pass');
    expect(Array.from(recovered)).not.toEqual(Array.from(accountMaster));
  });

  it('eraseSyncedContent keeps the account escrow when the device has none to replace it', async () => {
    // A mismatched device without a pending escrow (it was cleared, or the ring
    // came from an earlier unlock) has no key to install: deleting the account
    // escrow would leave the whole account keyless and orphan every other
    // device. Erase must drop only the unreadable rows and leave the account
    // key — and the mismatch — in place.
    const accountMaster = await seedMismatch();
    await clearPendingEscrow();

    await eraseSyncedContent(db);

    expect(await db.table<Row>('docs').get('acc')).toBeUndefined();
    expect((await db.table<Row>('docs').get('mine'))?.name).toBe('my note');
    const escrow = await db.cloudCrypto.get(ESCROW_ID);
    if (!escrow) throw new Error('expected the account escrow to survive');
    const recovered = await unwrapMasterSecret(escrow, 'old-pass');
    expect(Array.from(recovered)).toEqual(Array.from(accountMaster));
    expect(keyMismatchState.current()).toBe(true);
  });

  it('eraseSyncedContent clears a mismatch with neither a pending nor an account escrow', async () => {
    // A forced or stale mismatch signal with no escrow anywhere (e.g. the e2e
    // affordance, or residue after an account wipe) protects nothing: erase
    // still resolves it rather than stranding the device on the banner.
    await seedMismatch();
    await clearPendingEscrow();
    await db.cloudCrypto.delete(ESCROW_ID);

    await eraseSyncedContent(db);

    expect(keyMismatchState.current()).toBe(false);
  });
});
