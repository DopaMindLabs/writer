import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import dexieCloud from 'dexie-cloud-addon';
import type { SyncState, UserLogin } from 'dexie-cloud-addon';
import { LoremDB } from '@/db/LoremDB';
import type { CloudObservable } from './cloudObservable';
import { createEncryptionMiddleware } from './crypto/middleware';
import {
  deviceKeyProvider,
  forgetDeviceKeyRing,
  clearPendingEscrow,
  savePendingEscrow,
  saveDeviceKeyRing,
  loadPendingEscrow,
  onDeviceKeyRingChange,
} from './crypto/keyStore';
import { keyMismatchState } from './crypto/keyMismatch';
import { keylessLockState } from './crypto/keylessLock';
import { startKeylessLockMonitor } from './keylessGuard';
import {
  generateMasterSecret,
  wrapMasterSecret,
  deriveKeyRing,
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
  // The reconciler emits a gated diagnostic on a genuine mismatch; silence it so
  // the suite output stays clean, while still letting tests assert it fired.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  await forgetDeviceKeyRing();
  await clearPendingEscrow();
  db = build('escrow-reconcile-test');
  await db.open();
});

afterEach(async () => {
  keyMismatchState.set(false);
  keylessLockState.set(false);
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
  it('publishes the device escrow when the account has none and the pull is complete', async () => {
    await createCloudEncryption('pw', db);
    expect(await db.cloudCrypto.toArray()).toHaveLength(0);

    expect(await reconcileEscrow(db, () => true)).toBe('published');
    expect(await db.cloudCrypto.toArray()).toHaveLength(1);
    expect(keyMismatchState.current()).toBe(false);
  });

  it('defers publication until the initial account pull is confirmed complete', async () => {
    await createCloudEncryption('pw', db);

    // Pull not yet complete: an absent server row may just mean "not pulled".
    expect(await reconcileEscrow(db, () => false)).toBe('deferred');
    // Nothing published, pending escrow retained for the next settle.
    expect(await db.cloudCrypto.toArray()).toHaveLength(0);
    expect(await loadPendingEscrow()).not.toBeNull();
    expect(keyMismatchState.current()).toBe(false);
  });

  it('matches when the account escrow shares this device fingerprint', async () => {
    await createCloudEncryption('pw', db);
    await publishPendingEscrow(db);

    expect(await reconcileEscrow(db)).toBe('matched');
    expect(keyMismatchState.current()).toBe(false);
  });

  it('flags a mismatch when the account escrow is a different key', async () => {
    // A real foreign escrow is only present locally while signed into that
    // account, so set up as a signed-in device (skipping the residue clear).
    await db.cloudCrypto.put(
      await wrapMasterSecret(generateMasterSecret(), 'x', 1000),
    );
    await createCloudEncryption('pw', db, () => 'acct-a');

    expect(await reconcileEscrow(db)).toBe('mismatch');
    expect(keyMismatchState.current()).toBe(true);
  });

  it('warns with both fingerprints on a genuine mismatch (dev/e2e diagnostic)', async () => {
    await db.cloudCrypto.put(
      await wrapMasterSecret(generateMasterSecret(), 'x', 1000),
    );
    await createCloudEncryption('pw', db, () => 'acct-a');

    await reconcileEscrow(db);

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('escrow fingerprint mismatch'),
    );
  });

  it('matches when the account escrow shares the pending escrow fingerprint', async () => {
    // A device that published its escrow (server holds master M) but whose ring
    // was later re-derived from a different master N, with the original escrow
    // still pending locally. The server row is still ours — no mismatch.
    const masterM = generateMasterSecret();
    const escrowM = await wrapMasterSecret(masterM, 'pw', 1000);
    await db.cloudCrypto.put(escrowM); // server holds M
    await savePendingEscrow({ accountId: null, escrow: escrowM }); // pending still M
    await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(generateMasterSecret(), 1) }); // ring N

    expect(await reconcileEscrow(db)).toBe('matched');
    expect(keyMismatchState.current()).toBe(false);
  });

  it('is idle when the device holds no key', async () => {
    await forgetThisDevice();
    expect(await reconcileEscrow(db)).toBe('idle');
  });

  it('binds an unbound ring to the account when it publishes the escrow', async () => {
    // Set up while signed out, so the ring and pending escrow are unbound.
    await createCloudEncryption('pw', db);
    expect(deviceKeyProvider.accountId()).toBeNull();

    expect(await reconcileEscrow(db, () => true, 'acct-a')).toBe('published');
    // Publication claims the ring for the account it first signed into.
    expect(deviceKeyProvider.accountId()).toBe('acct-a');
  });

  it('binds an unbound ring to the account when the server fingerprint matches', async () => {
    await createCloudEncryption('pw', db); // unbound
    await publishPendingEscrow(db); // server now holds our escrow
    expect(deviceKeyProvider.accountId()).toBeNull();

    expect(await reconcileEscrow(db, () => true, 'acct-a')).toBe('matched');
    expect(deviceKeyProvider.accountId()).toBe('acct-a');
  });

  it('becomes keyless (not published) with a ring but no server or pending escrow', async () => {
    // A ring with nothing to publish and no account escrow is unusable here.
    await saveDeviceKeyRing({
      accountId: null,
      ring: await deriveKeyRing(generateMasterSecret(), 1),
    });
    expect(await loadPendingEscrow()).toBeNull();

    expect(await reconcileEscrow(db, () => true, 'acct-a')).toBe('keyless');
    expect(deviceKeyProvider.current()).toBeNull();
    expect(keylessLockState.current()).toBe(true);
  });
});

interface StubObservable<T> {
  observable: {
    subscribe: (next: (value: T) => void) => { unsubscribe: () => void };
  };
  emit: (value: T) => void;
  hasListener: () => boolean;
}

const stubObservable = <T,>(): StubObservable<T> => {
  // Multicast so one stub can feed several monitors (e.g. the escrow reconciler
  // and the keyless-lock monitor) the same identity stream, as in production.
  const listeners = new Set<(value: T) => void>();
  return {
    observable: {
      subscribe: (next) => {
        listeners.add(next);
        return {
          unsubscribe: () => {
            listeners.delete(next);
          },
        };
      },
    },
    emit: (value) => {
      for (const listener of listeners) listener(value);
    },
    hasListener: () => listeners.size > 0,
  };
};

const syncStub = () => stubObservable<SyncState>();
const emitPhase = (
  stub: StubObservable<SyncState>,
  phase: SyncState['phase'],
): void => stub.emit({ status: 'connected', phase });

type User = { userId: string; isLoggedIn: boolean } | undefined;
const userStub = () => stubObservable<User>();
// The reconciler only reads userId/isLoggedIn off the user login, so a minimal
// stub stands in for the full UserLogin shape.
const asUserObservable = (
  stub: StubObservable<User>,
): CloudObservable<UserLogin | undefined> =>
  stub.observable as unknown as CloudObservable<UserLogin | undefined>;

/** Let the serialised runner's finally-microtasks settle between assertions. */
const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('startEscrowReconciler', () => {
  it('runs on every transition into in-sync, not just the first', async () => {
    const sync = syncStub();
    const user = userStub();
    const run = vi.fn().mockResolvedValue(undefined);
    startEscrowReconciler(sync.observable, asUserObservable(user), run);

    emitPhase(sync, 'initial');
    emitPhase(sync, 'pulling');
    expect(run).not.toHaveBeenCalled();
    emitPhase(sync, 'in-sync');
    await flush();
    expect(run).toHaveBeenCalledTimes(1);
    // A later pull that settles again re-runs (the one-shot bug is gone).
    emitPhase(sync, 'pulling');
    emitPhase(sync, 'in-sync');
    await flush();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('runs when the signed-in identity changes (e.g. a late sign-in)', async () => {
    const sync = syncStub();
    const user = userStub();
    const run = vi.fn().mockResolvedValue(undefined);
    startEscrowReconciler(sync.observable, asUserObservable(user), run);

    user.emit({ userId: 'u1', isLoggedIn: true }); // signs in after boot
    await flush();
    expect(run).toHaveBeenCalledTimes(1);
    user.emit({ userId: 'u1', isLoggedIn: true }); // same identity, no re-run
    await flush();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('serialises overlapping runs and reruns once for triggers during a run', async () => {
    const sync = syncStub();
    const user = userStub();
    let resolveRun: () => void = () => undefined;
    const run = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRun = resolve;
        }),
    );
    startEscrowReconciler(sync.observable, asUserObservable(user), run);

    emitPhase(sync, 'in-sync'); // starts run #1 (in flight)
    emitPhase(sync, 'pulling');
    emitPhase(sync, 'in-sync'); // queued while #1 runs
    expect(run).toHaveBeenCalledTimes(1);
    resolveRun();
    await Promise.resolve();
    await Promise.resolve();
    expect(run).toHaveBeenCalledTimes(2); // exactly one rerun, no pile-up
  });

  it('survives a rejected run and keeps reconciling on later settles', async () => {
    const sync = syncStub();
    const user = userStub();
    const run = vi.fn().mockRejectedValue(new Error('transient (test)'));
    startEscrowReconciler(sync.observable, asUserObservable(user), run);

    emitPhase(sync, 'in-sync'); // first run rejects — must not throw out of the runner
    await flush();
    expect(run).toHaveBeenCalledTimes(1);
    // A later settle still schedules despite the earlier rejection.
    emitPhase(sync, 'pulling');
    emitPhase(sync, 'in-sync');
    await flush();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('does not run after unsubscribe', () => {
    const sync = syncStub();
    const user = userStub();
    const run = vi.fn().mockResolvedValue(undefined);
    const stop = startEscrowReconciler(sync.observable, asUserObservable(user), run);

    stop();
    expect(sync.hasListener()).toBe(false);
    expect(user.hasListener()).toBe(false);
    emitPhase(sync, 'in-sync');
    user.emit({ userId: 'u1', isLoggedIn: true });
    expect(run).not.toHaveBeenCalled();
  });

  it('discards account A material and locks writes when signing into empty account B', async () => {
    // Account A: set up and publish, so the ring is bound to A and on the server.
    await createCloudEncryption('pw', db, () => 'acct-a');
    await publishPendingEscrow(db, 'acct-a');
    expect(deviceKeyProvider.accountId()).toBe('acct-a');

    const sync = syncStub();
    const user = userStub();
    const run = vi.fn().mockResolvedValue(undefined);
    // Both monitors share the identity stream, as in a real session.
    const stopKeyless = startKeylessLockMonitor(
      asUserObservable(user),
      onDeviceKeyRingChange,
    );
    const stopEscrow = startEscrowReconciler(
      sync.observable,
      asUserObservable(user),
      run,
    );

    user.emit({ userId: 'acct-a', isLoggedIn: true }); // establish A

    // Sign into a different, empty account B.
    user.emit({ userId: 'acct-b', isLoggedIn: true });
    // The cached ring is dropped synchronously so the write lock engages at once.
    expect(deviceKeyProvider.current()).toBeNull();
    expect(keylessLockState.current()).toBe(true);

    // A content write on B is refused while the device is keyless.
    await expect(
      db.table<Row>('docs').put({
        id: 'b-write', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'B',
      }),
    ).rejects.toThrow();

    // A's material is forgotten from the keystore, not just the cache.
    await flush();
    expect(await loadPendingEscrow()).toBeNull();
    expect(deviceKeyProvider.accountId()).toBeNull();

    stopKeyless();
    stopEscrow();
  });
});
