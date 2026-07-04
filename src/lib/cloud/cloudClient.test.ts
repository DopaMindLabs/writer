import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  cloudSyncState,
  cloudUserInteraction,
  cloudCurrentUser,
  signInToCloud,
  signOutOfCloud,
  hydrateCloudDevice,
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
