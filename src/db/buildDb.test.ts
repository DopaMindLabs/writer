import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Dexie from 'dexie';
import { buildDb } from './buildDb';
import { LoremDB } from './LoremDB';
import { STORES, BASE_STORES } from './stores';
import { CLOUD_FLAG_KEY } from '@/lib/cloud/flag';
import { generateMasterSecret, deriveKeyRing } from '@/lib/cloud/crypto/keys';
import {
  saveDeviceKeyRing,
  forgetDeviceKeyRing,
} from '@/lib/cloud/crypto/keyStore';
import { CIPHER_FIELD } from '@/lib/cloud/crypto/tableRules';

const CLOUD_URL = 'https://spike.dexie.cloud';
/** Mirrors buildDb's local-only list; the escrow table (`cloudCrypto`) syncs. */
const UNSYNCED = [
  'settings', 'backups', 'syncs', 'syncConfigs',
  'docInspectorConfigs', 'meta', 'docUpdates', 'media', 'pdfAnnotations',
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

  it('applies the STORES schema table-for-table at the current version', async () => {
    const db = buildDb('build-db-schema-test');
    await db.open();

    expect(db.verno).toBe(2);
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      Object.keys(STORES).sort(),
    );
    for (const table of db.tables) {
      expect(table.schema.primKey.keyPath).toBe(primKeyPath(STORES[table.name]));
    }

    await db.delete();
  });

  it('upgrades a version-1 install to version 2, keeping data and adding media', async () => {
    const name = 'build-db-migration-test';
    // Simulate an install that only ever ran the shipped version(1) schema.
    const legacy = new Dexie(name);
    legacy.version(1).stores(BASE_STORES);
    await legacy.open();
    await legacy.table('spaces').put({
      id: 'keep', tag: 't', name: 'N', shared: false,
      template: 'x', createdAt: 1, updatedAt: 1,
    });
    legacy.close();

    // Reopening through LoremDB (version 1 + 2) must migrate in place.
    const db = new LoremDB(name);
    await db.open();
    expect(db.verno).toBe(2);
    expect(db.tables.map((t) => t.name)).toContain('media');
    expect((await db.table<{ id: string }>('spaces').get('keep'))?.id).toBe('keep');

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
    expect(names).not.toContain('cloudDevices');
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
    // The device registry for the two-device beta limit syncs alongside it.
    expect(names).toContain('cloudDevices');
    // The addon is active: it created the per-table mutation queues.
    expect(names).toContain('$docs_mutations');
    expect((db as { cloud: { options: { unsyncedTables: string[] } } }).cloud.options
      .unsyncedTables).toEqual(UNSYNCED);

    await db.delete();
  });

  it('registers the encryption middleware (content is ciphertext at rest)', async () => {
    enableCloud();
    await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(generateMasterSecret(), 1) });
    const db = buildDb('gate-middleware');
    await db.open();

    await db.table('notes').put({
      id: 'n1', spaceId: 's1', kind: 'text', createdAt: 1, title: 'SECRET',
    });
    // Read the stored bytes past the middleware via its blob-resolve bypass;
    // nulling the key would now be hidden by the keyless read protection.
    const raw = await db.transaction('r', db.table('notes'), async () => {
      const tx = Dexie.currentTransaction as unknown as {
        idbtrans?: { disableBlobResolve?: boolean };
      };
      if (tx.idbtrans) tx.idbtrans.disableBlobResolve = true;
      return db.table<Record<string, unknown>>('notes').get('n1');
    });
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

  /**
   * The addon injects its own access-control schema (`realms`, `members`,
   * `roles`) when it merges DEXIE_CLOUD_SCHEMA into the declared stores, so the
   * app must not declare them itself — redeclaring one with a different primary
   * key makes the addon throw. These pin that they arrive, unencrypted, and only
   * on a cloud-enabled instance.
   */
  it('gains the addon-managed access-control tables on a cloud instance', async () => {
    enableCloud();
    const cloudDb = buildDb('gate-realms');
    await cloudDb.open();

    const names = cloudDb.tables.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['realms', 'members', 'roles']));
    // Injected, not declared: the app's own schema stays at its declared version
    // (2 — the base stores plus the version(2) PDF tables), with no extra
    // version added for the addon's access-control tables.
    expect(cloudDb.verno).toBe(2);

    await cloudDb.delete();
  });

  it('has no access-control tables on a plain instance', async () => {
    const plainDb = buildDb('gate-realms-plain');
    await plainDb.open();

    const names = plainDb.tables.map((t) => t.name);
    expect(names).not.toContain('realms');
    expect(names).not.toContain('members');
    expect(names).not.toContain('roles');

    await plainDb.delete();
  });

  it('leaves realm rows in the clear — the server reads them for access control', async () => {
    enableCloud();
    const cloudDb = buildDb('gate-realms-plaintext');
    await cloudDb.table('realms').put({ realmId: 'rlm-1', name: 'Shared space' });

    const row = await cloudDb.table<Record<string, unknown>>('realms').get('rlm-1');
    expect(row?.name).toBe('Shared space');
    expect(row).not.toHaveProperty(CIPHER_FIELD);

    await cloudDb.delete();
  });
});
