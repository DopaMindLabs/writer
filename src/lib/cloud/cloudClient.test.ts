import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import Dexie, { type Table } from 'dexie';
import { db } from '@/db/db';
import {
  cloudSyncState,
  cloudUserInteraction,
  cloudCurrentUser,
  cloudEscrowPresence,
  requestCloudSync,
  signInToCloud,
  signOutOfCloud,
  hydrateCloudDevice,
  startCloudSession,
  resetCloudDevice,
  isAccountPullComplete,
  KeylessSignInBlockedError,
  type SyncState,
  type EscrowPresence,
} from './cloudClient';
import { CLOUD_FLAG_KEY } from './flag';
import {
  deviceKeyProvider,
  saveDeviceKeyRing,
  forgetDeviceKeyRing,
} from './crypto/keyStore';
import { keyMismatchState } from './crypto/keyMismatch';
import { keylessLockState } from './crypto/keylessLock';
import { deriveKeyRing, generateMasterSecret, ESCROW_ID, type EscrowRecord } from './crypto/keys';
import { resetAndReseed } from '@/db/seed';

vi.mock('@/db/seed', () => ({ resetAndReseed: vi.fn(async () => {}) }));

// In the test environment the app database is plain (both gates off), so
// `db.cloud` is absent and every getter must fall back safely.
describe('cloudClient without a cloud database', () => {
  it('sync state falls back to a constant initial phase', () => {
    let phase: string | undefined;
    cloudSyncState().subscribe((s) => {
      phase = s.phase;
    });
    expect(phase).toBe('initial');
  });

  it('user interaction and current user fall back to undefined', () => {
    let interaction: unknown = 'unset';
    let user: unknown = 'unset';
    cloudUserInteraction().subscribe((v) => {
      interaction = v;
    });
    cloudCurrentUser().subscribe((v) => {
      user = v;
    });
    expect(interaction).toBeUndefined();
    expect(user).toBeUndefined();
  });

  it('sign in and out resolve as no-ops', async () => {
    await expect(signInToCloud()).resolves.toBeUndefined();
    await expect(signOutOfCloud()).resolves.toBeUndefined();
  });

  it('a sync request resolves as a no-op', async () => {
    await expect(requestCloudSync()).resolves.toBeUndefined();
  });
});

describe('requestCloudSync forces a pull', () => {
  afterEach(() => {
    delete (db as { cloud?: unknown }).cloud;
  });

  it('calls the addon sync with a pull purpose', async () => {
    const sync = vi.fn().mockResolvedValue(undefined);
    (db as unknown as { cloud?: { sync: typeof sync } }).cloud = { sync };
    await requestCloudSync();
    expect(sync).toHaveBeenCalledWith({ purpose: 'pull', wait: true });
  });
});

describe('signOutOfCloud frees the device slot', () => {
  let registryDb: Dexie;

  const registry = (): Table<{ id: string }, string> =>
    registryDb.table<{ id: string }, string>('cloudDevices');

  interface SignOutCloud {
    logout: ReturnType<typeof vi.fn>;
    sync: ReturnType<typeof vi.fn>;
    persistedSyncState: { value: { clientIdentity: string } };
  }

  const withSignOutCloud = (): SignOutCloud => {
    const cloud: SignOutCloud = {
      logout: vi.fn().mockResolvedValue(undefined),
      sync: vi.fn().mockResolvedValue(undefined),
      persistedSyncState: { value: { clientIdentity: 'me' } },
    };
    (db as unknown as { cloud?: SignOutCloud }).cloud = cloud;
    return cloud;
  };

  beforeEach(async () => {
    registryDb = new Dexie('signout-registry');
    registryDb.version(1).stores({ cloudDevices: 'id' });
    await registryDb.open();
    (db as { cloudDevices?: Table<{ id: string }, string> }).cloudDevices = registry();
  });

  afterEach(async () => {
    delete (db as { cloud?: unknown }).cloud;
    delete (db as { cloudDevices?: unknown }).cloudDevices;
    await registryDb.delete();
  });

  it('releases the device row and pushes the deletion before logging out', async () => {
    const cloud = withSignOutCloud();
    await registry().put({ id: 'me' });
    await registry().put({ id: 'other' });

    await signOutOfCloud();

    // dexie-cloud's logout never pushes pending mutations, so the deletion must
    // be flushed explicitly first or the slot stays occupied on the server.
    expect(await registry().get('me')).toBeUndefined();
    expect(await registry().get('other')).toBeDefined();
    expect(cloud.sync).toHaveBeenCalledWith({ purpose: 'push', wait: true });
    const pushOrder = cloud.sync.mock.invocationCallOrder[0];
    const logoutOrder = cloud.logout.mock.invocationCallOrder[0];
    expect(pushOrder).toBeDefined();
    expect(logoutOrder).toBeDefined();
    expect(pushOrder).toBeLessThan(logoutOrder ?? 0);
  });

  it('still logs out when the push flush fails (offline sign-out)', async () => {
    const cloud = withSignOutCloud();
    cloud.sync.mockRejectedValue(new Error('offline'));
    await registry().put({ id: 'me' });

    await expect(signOutOfCloud()).resolves.toBeUndefined();
    expect(cloud.logout).toHaveBeenCalledTimes(1);
  });
});

describe('signInToCloud guard (clean vs dirty keyless device)', () => {
  const login = vi.fn().mockResolvedValue(undefined);
  const withCloudLogin = (): void => {
    (db as { cloud?: { login: () => Promise<void> } }).cloud = { login };
  };

  beforeEach(async () => {
    login.mockClear();
    await forgetDeviceKeyRing();
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    delete (db as { cloud?: unknown }).cloud;
    await db.delete();
    await db.open();
  });

  it('blocks sign-in while keyless with unencrypted writing on the device', async () => {
    withCloudLogin();
    await db.docs.add({
      id: 'd', spaceId: 's', sectionId: 'x', name: 'n', body: 'plain',
      meta: { wordCount: 1 }, updatedAt: 1,
    });
    await expect(signInToCloud()).rejects.toBeInstanceOf(KeylessSignInBlockedError);
    expect(login).not.toHaveBeenCalled();
  });

  it('allows sign-in on a clean keyless device (no plaintext synced rows)', async () => {
    withCloudLogin();
    await expect(signInToCloud()).resolves.toBeUndefined();
    expect(login).toHaveBeenCalledTimes(1);
  });
});

interface FakeCloud {
  currentUser: { value: { isLoggedIn: boolean; userId?: string } };
  persistedSyncState: { value: { initiallySynced: boolean; realms?: string[] } };
}

describe('isAccountPullComplete', () => {
  const withCloud = (cloud: FakeCloud): void => {
    (db as { cloud?: FakeCloud }).cloud = cloud;
  };

  afterEach(() => {
    delete (db as { cloud?: FakeCloud }).cloud;
  });

  it('is false on a plain (non-cloud) database', () => {
    expect(isAccountPullComplete()).toBe(false);
  });

  it('is true once signed in and the initial sync has completed', () => {
    withCloud({
      currentUser: { value: { isLoggedIn: true, userId: 'u1' } },
      persistedSyncState: { value: { initiallySynced: true, realms: ['u1'] } },
    });
    expect(isAccountPullComplete()).toBe(true);
  });

  it('resolves for a fresh account whose empty private realm is not enumerated', () => {
    // The addon only lists a realm once it holds a row, so a brand-new account
    // reports realms without its own id (here only the public realm). The pull is
    // still complete — waiting for the private realm would hang forever.
    withCloud({
      currentUser: { value: { isLoggedIn: true, userId: 'u1' } },
      persistedSyncState: { value: { initiallySynced: true, realms: ['rlm-public'] } },
    });
    expect(isAccountPullComplete()).toBe(true);
  });

  it('is false before the initial sync completes', () => {
    withCloud({
      currentUser: { value: { isLoggedIn: true, userId: 'u1' } },
      persistedSyncState: { value: { initiallySynced: false, realms: ['u1'] } },
    });
    expect(isAccountPullComplete()).toBe(false);
  });

  it('is false when signed out even after an initial sync', () => {
    withCloud({
      currentUser: { value: { isLoggedIn: false } },
      persistedSyncState: { value: { initiallySynced: true } },
    });
    expect(isAccountPullComplete()).toBe(false);
  });
});

/** A minimal behaviour subject: emits its current value synchronously on
 *  subscribe and on every `next`, mirroring the addon's `syncState` observable. */
interface Subject<T> {
  readonly value: T;
  subscribe: (next: (value: T) => void) => { unsubscribe: () => void };
  next: (value: T) => void;
}
const makeSubject = <T,>(initial: T): Subject<T> => {
  let current = initial;
  const listeners = new Set<(value: T) => void>();
  return {
    get value() {
      return current;
    },
    subscribe: (next) => {
      next(current);
      listeners.add(next);
      return {
        unsubscribe: () => {
          listeners.delete(next);
        },
      };
    },
    next: (value) => {
      current = value;
      for (const listener of listeners) listener(value);
    },
  };
};

/** The slice of `db.cloud` the escrow-presence path reads. */
interface PresenceCloud {
  syncState: Subject<SyncState>;
  currentUser: { value: { isLoggedIn: boolean } };
  persistedSyncState: { value: { initiallySynced: boolean } };
}

describe('cloudEscrowPresence', () => {
  const INITIAL: SyncState = { status: 'not-started', phase: 'initial' };
  let escrowDb: Dexie;

  const dummyEscrow = (): EscrowRecord => ({
    id: ESCROW_ID,
    epoch: 1,
    kdf: 'PBKDF2',
    hash: 'SHA-512',
    iterations: 1,
    salt: new Uint8Array([1]),
    iv: new Uint8Array([2]),
    wrapped: new Uint8Array([3]),
    fingerprint: new Uint8Array([4]),
  });

  const escrowTable = (): Table<EscrowRecord, string> =>
    escrowDb.table<EscrowRecord, string>('cloudCrypto');

  const withCloud = (cloud: PresenceCloud): void => {
    (db as { cloud?: PresenceCloud }).cloud = cloud;
  };

  const signedInPull = (complete: boolean): PresenceCloud => ({
    syncState: makeSubject<SyncState>(INITIAL),
    currentUser: { value: { isLoggedIn: true } },
    persistedSyncState: { value: { initiallySynced: complete } },
  });

  beforeEach(async () => {
    // A real Dexie `cloudCrypto` table so the presence liveQuery observes actual
    // rows (the app db is plain in tests and has no such store).
    escrowDb = new Dexie('presence-escrow');
    escrowDb.version(1).stores({ cloudCrypto: 'id' });
    await escrowDb.open();
    (db as { cloudCrypto?: Table<EscrowRecord, string> }).cloudCrypto = escrowTable();
  });

  afterEach(async () => {
    delete (db as { cloud?: PresenceCloud }).cloud;
    delete (db as { cloudCrypto?: Table<EscrowRecord, string> }).cloudCrypto;
    await escrowDb.delete();
  });

  it("is a constant 'none' on a plain (non-cloud) database", () => {
    delete (db as { cloud?: PresenceCloud }).cloud;
    const seen: EscrowPresence[] = [];
    const sub = cloudEscrowPresence().subscribe((p) => seen.push(p));
    expect(seen).toEqual(['none']);
    sub.unsubscribe();
  });

  it("stays 'unknown' until the initial pull completes, even with an escrow present", async () => {
    await escrowTable().put(dummyEscrow());
    withCloud(signedInPull(false));

    const seen: EscrowPresence[] = [];
    const sub = cloudEscrowPresence().subscribe((p) => seen.push(p));

    expect(seen[0]).toBe('unknown');
    // Let the row liveQuery settle; the pull is still incomplete, so it must not
    // reveal the escrow yet (a Set-up now could mint a divergent key).
    await waitFor(() => expect(seen.length).toBeGreaterThan(1));
    expect(seen.every((p) => p === 'unknown')).toBe(true);
    sub.unsubscribe();
  });

  it("emits 'present' once the pull completes and the account holds an escrow", async () => {
    await escrowTable().put(dummyEscrow());
    const cloud = signedInPull(false);
    withCloud(cloud);

    const seen: EscrowPresence[] = [];
    const sub = cloudEscrowPresence().subscribe((p) => seen.push(p));
    expect(seen[0]).toBe('unknown');

    cloud.persistedSyncState.value.initiallySynced = true;
    cloud.syncState.next({ status: 'connected', phase: 'in-sync' });

    await waitFor(() => expect(seen.at(-1)).toBe('present'));
    sub.unsubscribe();
  });

  it("emits 'none' once the pull completes with no escrow on the account", async () => {
    withCloud(signedInPull(true));

    const seen: EscrowPresence[] = [];
    const sub = cloudEscrowPresence().subscribe((p) => seen.push(p));

    await waitFor(() => expect(seen.at(-1)).toBe('none'));
    sub.unsubscribe();
  });

  it("never flashes 'none' on a device whose pull is already complete (escrow present)", async () => {
    // The reload path: initiallySynced was persisted true and the account HAS an
    // escrow, but the row liveQuery has not resolved yet at subscribe time. A
    // premature 'none' here offers Set-up and can mint a key that diverges from
    // the account's — presence must stay 'unknown' until the row query settles.
    await escrowTable().put(dummyEscrow());
    withCloud(signedInPull(true));

    const seen: EscrowPresence[] = [];
    const sub = cloudEscrowPresence().subscribe((p) => seen.push(p));

    expect(seen[0]).toBe('unknown');
    await waitFor(() => expect(seen.at(-1)).toBe('present'));
    expect(seen).not.toContain('none');
    sub.unsubscribe();
  });
});

describe('hydrateCloudDevice', () => {
  afterEach(async () => {
    await forgetDeviceKeyRing();
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('loads the persisted device ring when the database is cloud-enabled', async () => {
    vi.stubEnv('VITE_DEXIE_CLOUD_URL', 'https://x.dexie.cloud');
    localStorage.setItem(CLOUD_FLAG_KEY, 'on');
    await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(generateMasterSecret(), 1) });

    await hydrateCloudDevice();
    expect(deviceKeyProvider.current()).not.toBeNull();
  });

  it('is a no-op when the database is not cloud-enabled', async () => {
    await forgetDeviceKeyRing();
    await hydrateCloudDevice();
    expect(deviceKeyProvider.current()).toBeNull();
  });
});

describe('startCloudSession', () => {
  it('resolves to a stop function that tears the session down without throwing', async () => {
    const stop = await startCloudSession();
    expect(typeof stop).toBe('function');
    expect(() => stop()).not.toThrow();
  });
});

describe('resetCloudDevice', () => {
  beforeEach(() => {
    vi.mocked(resetAndReseed).mockClear();
    vi.mocked(resetAndReseed).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    keyMismatchState.set(false);
    keylessLockState.set(false);
    await forgetDeviceKeyRing();
  });

  it('forgets the device key, clears both write locks, and reseeds', async () => {
    await saveDeviceKeyRing({
      accountId: 'acct-a',
      ring: await deriveKeyRing(generateMasterSecret(), 1),
    });
    keyMismatchState.set(true);
    keylessLockState.set(true);

    await resetCloudDevice();

    expect(deviceKeyProvider.current()).toBeNull();
    expect(keyMismatchState.current()).toBe(false);
    expect(keylessLockState.current()).toBe(false);
    expect(resetAndReseed).toHaveBeenCalledTimes(1);
  });

  it('propagates a reseed failure instead of leaving an empty database silently', async () => {
    vi.mocked(resetAndReseed).mockRejectedValueOnce(new Error('reseed boom'));
    await expect(resetCloudDevice()).rejects.toThrow('reseed boom');
  });
});
