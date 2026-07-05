import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import dexieCloud from 'dexie-cloud-addon';
import type { SyncState } from 'dexie-cloud-addon';
import { LoremDB } from '@/db/LoremDB';
import { createEncryptionMiddleware } from './crypto/middleware';
import {
  deviceKeyProvider,
  forgetDeviceKeyRing,
  clearPendingEscrow,
} from './crypto/keyStore';
import { keyMismatchState } from './crypto/keyMismatch';
import {
  generateMasterSecret,
  wrapMasterSecret,
} from './crypto/keys';
import {
  createCloudEncryption,
  publishPendingEscrow,
  forgetThisDevice,
} from './setup';
import {
  reconcileEscrow,
  startEscrowReconciler,
  hasLocalSyncedData,
} from './escrowReconcile';

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

beforeEach(async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline (test)'));
  vi.stubGlobal('WebSocket', class {
    close() {}
    addEventListener() {}
    removeEventListener() {}
    send() {}
  });
  keyMismatchState.set(false);
  await forgetDeviceKeyRing();
  await clearPendingEscrow();
  db = build('escrow-reconcile-test');
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

describe('hasLocalSyncedData', () => {
  it('is false when empty and true once a synced row exists', async () => {
    expect(await hasLocalSyncedData(db)).toBe(false);
    await db.table<Row>('docs').put({
      id: 'd', spaceId: 's', sectionId: 'x', updatedAt: 1,
    });
    expect(await hasLocalSyncedData(db)).toBe(true);
  });
});

describe('reconcileEscrow', () => {
  it('publishes the device escrow when the account has none', async () => {
    await createCloudEncryption('pw', db);
    expect(await db.cloudCrypto.toArray()).toHaveLength(0);

    expect(await reconcileEscrow(db)).toBe('published');
    expect(await db.cloudCrypto.toArray()).toHaveLength(1);
    expect(keyMismatchState.current()).toBe(false);
  });

  it('matches when the account escrow shares this device fingerprint', async () => {
    await createCloudEncryption('pw', db);
    await publishPendingEscrow(db);

    expect(await reconcileEscrow(db)).toBe('matched');
    expect(keyMismatchState.current()).toBe(false);
  });

  it('flags a mismatch when the account escrow is a different key', async () => {
    await db.cloudCrypto.put(
      await wrapMasterSecret(generateMasterSecret(), 'x', 1000),
    );
    await createCloudEncryption('pw', db);

    expect(await reconcileEscrow(db)).toBe('mismatch');
    expect(keyMismatchState.current()).toBe(true);
  });

  it('is idle when the device holds no key', async () => {
    await forgetThisDevice();
    expect(await reconcileEscrow(db)).toBe('idle');
  });
});

interface StubObservable {
  observable: {
    subscribe: (next: (s: SyncState) => void) => { unsubscribe: () => void };
  };
  emit: (phase: SyncState['phase']) => void;
  hasListener: () => boolean;
}

const stubObservable = (): StubObservable => {
  let listener: ((s: SyncState) => void) | null = null;
  return {
    observable: {
      subscribe: (next) => {
        listener = next;
        return {
          unsubscribe: () => {
            listener = null;
          },
        };
      },
    },
    emit: (phase) => listener?.({ status: 'connected', phase }),
    hasListener: () => listener !== null,
  };
};

describe('startEscrowReconciler', () => {
  it('runs once when the first sync reaches in-sync', () => {
    const stub = stubObservable();
    const run = vi.fn().mockResolvedValue(undefined);
    startEscrowReconciler(stub.observable, run);

    stub.emit('initial');
    stub.emit('pulling');
    expect(run).not.toHaveBeenCalled();
    stub.emit('in-sync');
    expect(run).toHaveBeenCalledTimes(1);
    stub.emit('in-sync');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not run after unsubscribe', () => {
    const stub = stubObservable();
    const run = vi.fn().mockResolvedValue(undefined);
    const stop = startEscrowReconciler(stub.observable, run);

    stop();
    expect(stub.hasListener()).toBe(false);
    stub.emit('in-sync');
    expect(run).not.toHaveBeenCalled();
  });
});
