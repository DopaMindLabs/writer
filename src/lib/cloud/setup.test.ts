import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import dexieCloud from 'dexie-cloud-addon';
import { LoremDB } from '@/db/LoremDB';
import { createEncryptionMiddleware } from './crypto/middleware';
import {
  deviceKeyProvider,
  saveDeviceKeyRing,
  forgetDeviceKeyRing,
} from './crypto/keyStore';
import { CIPHER_FIELD } from './crypto/tableRules';
import {
  generateMasterSecret,
  WrongPassphraseError,
} from './crypto/keys';
import { encodeRecoveryCode } from './crypto/recoveryCode';
import { EnvelopeIntegrityError } from './crypto/envelope';
import {
  createCloudEncryption,
  unlockCloudEncryption,
  recoverCloudEncryption,
  sealExistingRows,
  forgetThisDevice,
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
  await forgetDeviceKeyRing();
  await db.delete();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('cloud setup', () => {
  it('escrows exactly one row and returns a decodable recovery code', async () => {
    const code = await createCloudEncryption('correct horse battery', db);
    const escrows = await db.cloudCrypto.toArray();
    expect(escrows).toHaveLength(1);
    expect(escrows[0].id).toBe('v1');
    expect(code).toMatch(/^[0-9A-Z-]+$/);
    // Round-trips: recovering from the code on a fresh device yields a usable key.
    await forgetThisDevice();
    await recoverCloudEncryption(code, db);
    expect(deviceKeyProvider.current()).not.toBeNull();
  });

  it('unlock with the right passphrase loads a usable ring', async () => {
    await createCloudEncryption('pw', db);
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

  it('forgetThisDevice removes the ring but not the escrow', async () => {
    await createCloudEncryption('pw', db);
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
