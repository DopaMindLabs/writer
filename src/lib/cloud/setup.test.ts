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
} from './crypto/keys';
import { keyMismatchState } from './crypto/keyMismatch';
import { encodeRecoveryCode } from './crypto/recoveryCode';
import { EnvelopeIntegrityError } from './crypto/envelope';
import {
  createCloudEncryption,
  unlockCloudEncryption,
  recoverCloudEncryption,
  sealExistingRows,
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
  await forgetDeviceKeyRing();
  try {
    return await db.table<Row>(table).get(key);
  } finally {
    if (ring) await saveDeviceKeyRing(ring);
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
    expect(escrows[0].id).toBe('v1');
    expect(await loadPendingEscrow()).toBeNull();

    // Round-trips: recovering from the code on a fresh device yields a usable key.
    await forgetThisDevice();
    await recoverCloudEncryption(code, db);
    expect(deviceKeyProvider.current()).not.toBeNull();
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
    expect(await db.cloudCrypto.get('v1')).toBeDefined();
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
});

describe('cloud key conflict resolution', () => {
  const FAST = 1000;

  /** Seed an account whose data (`acc`) and escrow are protected by their own
   *  master, then have this device set up its *own* key and write its own note
   *  (`mine`) — the exact mismatch a wiped device hits when it re-signs-in. */
  const seedMismatch = async (): Promise<Uint8Array> => {
    const accountMaster = generateMasterSecret();
    await saveDeviceKeyRing(await deriveKeyRing(accountMaster, 1));
    await db.table<Row>('docs').put({
      id: 'acc', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'account note',
    });
    await db.cloudCrypto.put(await wrapMasterSecret(accountMaster, 'old-pass', FAST));
    await createCloudEncryption('new-pass', db);
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
    const escrow = await db.cloudCrypto.get('v1');
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
    const escrow = await db.cloudCrypto.get('v1');
    if (!escrow) throw new Error('expected the device escrow to be published');
    const recovered = await unwrapMasterSecret(escrow, 'new-pass');
    expect(Array.from(recovered)).not.toEqual(Array.from(accountMaster));
  });
});
