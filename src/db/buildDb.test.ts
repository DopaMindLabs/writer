import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildDb } from './buildDb';
import { STORES } from './stores';
import { CLOUD_FLAG_KEY } from '@/lib/cloud/flag';
import { generateMasterSecret, deriveKeyRing } from '@/lib/cloud/crypto/keys';
import {
  saveDeviceKeyRing,
  forgetDeviceKeyRing,
  deviceKeyProvider,
} from '@/lib/cloud/crypto/keyStore';
import { CIPHER_FIELD } from '@/lib/cloud/crypto/tableRules';

const CLOUD_URL = 'https://spike.dexie.cloud';
/** Mirrors buildDb's local-only list; the escrow table (`cloudCrypto`) syncs. */
const UNSYNCED = [
  'settings', 'backups', 'syncs', 'syncConfigs',
  'docInspectorConfigs', 'meta', 'docUpdates', 'shares',
];

/** Primary-key path a STORES spec declares, stripped of Dexie modifiers. */
const primKeyPath = (spec: string): string =>
  spec.split(',')[0].trim().replace(/^\+\+/, '').replace(/^&/, '');

const enableCloud = (): void => {
  vi.stubEnv('VITE_DEXIE_CLOUD_URL', CLOUD_URL);
  localStorage.setItem(CLOUD_FLAG_KEY, 'on');
};

describe('buildDb', () => {
  it('constructs a database named lipsum by default', () => {
    const db = buildDb();
    expect(db.name).toBe('lipsum');
    db.close();
  });

  it('accepts a custom name', () => {
    const db = buildDb('custom-name');
    expect(db.name).toBe('custom-name');
    db.close();
  });

  it('applies the STORES schema table-for-table at version 1', async () => {
    const db = buildDb('build-db-schema-test');
    await db.open();

    expect(db.verno).toBe(1);
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      Object.keys(STORES).sort(),
    );
    for (const table of db.tables) {
      expect(table.schema.primKey.keyPath).toBe(primKeyPath(STORES[table.name]));
    }

    await db.delete();
  });
});

describe('buildDb — cloud activation gates', () => {
  beforeEach(() => {
    // Keep every cloud instance offline and deterministic.
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline (test)'));
    vi.stubGlobal(
      'WebSocket',
      class {
        close() {}
        addEventListener() {}
        removeEventListener() {}
        send() {}
      },
    );
  });

  afterEach(async () => {
    await forgetDeviceKeyRing();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const expectBaseSchema = async (db: Awaited<ReturnType<typeof buildDb>>) => {
    await db.open();
    const names = db.tables.map((t) => t.name);
    expect(names).not.toContain('cloudCrypto');
    expect(names).not.toContain('$docs_mutations');
    expect((db as { cloud?: unknown }).cloud).toBeUndefined();
    await db.delete();
  };

  it('env only (no flag) builds the plain local database', async () => {
    vi.stubEnv('VITE_DEXIE_CLOUD_URL', CLOUD_URL);
    await expectBaseSchema(buildDb('gate-env-only'));
  });

  it('flag only (no env) builds the plain local database', async () => {
    localStorage.setItem(CLOUD_FLAG_KEY, 'on');
    await expectBaseSchema(buildDb('gate-flag-only'));
  });

  it('both gates build a cloud database with escrow table and sync config', async () => {
    enableCloud();
    const db = buildDb('gate-both');
    await db.open();

    const names = db.tables.map((t) => t.name);
    expect(names).toContain('cloudCrypto');
    // The addon is active: it created the per-table mutation queues.
    expect(names).toContain('$docs_mutations');
    expect((db as { cloud: { options: { unsyncedTables: string[] } } }).cloud.options
      .unsyncedTables).toEqual(UNSYNCED);

    await db.delete();
  });

  it('registers the encryption middleware (content is ciphertext at rest)', async () => {
    enableCloud();
    await saveDeviceKeyRing(await deriveKeyRing(generateMasterSecret(), 1));
    const db = buildDb('gate-middleware');
    await db.open();

    await db.table('notes').put({
      id: 'n1', spaceId: 's1', kind: 'text', createdAt: 1, title: 'SECRET',
    });
    // Drop the key so the middleware returns the stored bytes without decrypting.
    await forgetDeviceKeyRing();
    expect(deviceKeyProvider.current()).toBeNull();
    const raw = await db.table<Record<string, unknown>>('notes').get('n1');
    expect(raw?.[CIPHER_FIELD]).toBeDefined();
    expect(raw?.title).toBeUndefined();

    await db.delete();
  });

  it('opting out (flag off) stays on the cloud schema and keeps rows', async () => {
    enableCloud();
    const cloudDb = buildDb('gate-optout');
    await cloudDb.table('docs').put({ id: 'keep', spaceId: 's', sectionId: 'x', updatedAt: 1 });
    cloudDb.close();

    // Flag off but the device is provisioned: the cloud schema is sticky, so a
    // rebuild must not drop to a plain database and erase the row.
    localStorage.removeItem(CLOUD_FLAG_KEY);
    const rebuilt = buildDb('gate-optout');
    await rebuilt.open();
    expect(rebuilt.tables.map((t) => t.name)).toContain('cloudCrypto');
    const row = await rebuilt.table<{ id: string }>('docs').get('keep');
    expect(row?.id).toBe('keep');

    await rebuilt.delete();
  });
});
