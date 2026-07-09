import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { db } from '@/db/db';
import {
  cloudSyncState,
  cloudUserInteraction,
  cloudCurrentUser,
  signInToCloud,
  signOutOfCloud,
  hydrateCloudDevice,
  isAccountPullComplete,
  KeylessSignInBlockedError,
} from './cloudClient';
import { CLOUD_FLAG_KEY } from './flag';
import {
  deviceKeyProvider,
  saveDeviceKeyRing,
  forgetDeviceKeyRing,
} from './crypto/keyStore';
import { deriveKeyRing, generateMasterSecret } from './crypto/keys';

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
  currentUser: { value: { isLoggedIn: boolean; userId: string } };
  persistedSyncState: { value: { initiallySynced: boolean; realms: string[] } };
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

  it('is true once signed in, initially synced, and the user realm is pulled', () => {
    withCloud({
      currentUser: { value: { isLoggedIn: true, userId: 'u1' } },
      persistedSyncState: { value: { initiallySynced: true, realms: ['u1'] } },
    });
    expect(isAccountPullComplete()).toBe(true);
  });

  it('is false until the user realm has been pulled', () => {
    withCloud({
      currentUser: { value: { isLoggedIn: true, userId: 'u1' } },
      persistedSyncState: { value: { initiallySynced: true, realms: [] } },
    });
    expect(isAccountPullComplete()).toBe(false);
  });

  it('is false before the initial sync completes', () => {
    withCloud({
      currentUser: { value: { isLoggedIn: true, userId: 'u1' } },
      persistedSyncState: { value: { initiallySynced: false, realms: ['u1'] } },
    });
    expect(isAccountPullComplete()).toBe(false);
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
    await saveDeviceKeyRing(await deriveKeyRing(generateMasterSecret(), 1));

    await hydrateCloudDevice();
    expect(deviceKeyProvider.current()).not.toBeNull();
  });

  it('is a no-op when the database is not cloud-enabled', async () => {
    await forgetDeviceKeyRing();
    await hydrateCloudDevice();
    expect(deviceKeyProvider.current()).toBeNull();
  });
});
