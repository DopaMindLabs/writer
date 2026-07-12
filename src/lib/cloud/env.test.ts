import { describe, it, expect, afterEach, vi } from 'vitest';
import { cloudDatabaseUrl, cloudFlagFromEnv, hasCloudEnv } from './env';

describe('cloud env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is null when the url is unset', () => {
    vi.stubEnv('VITE_DEXIE_CLOUD_URL', '');
    expect(cloudDatabaseUrl()).toBeNull();
    expect(hasCloudEnv()).toBe(false);
  });

  it('is null for a non-https url', () => {
    vi.stubEnv('VITE_DEXIE_CLOUD_URL', 'http://insecure.example');
    expect(cloudDatabaseUrl()).toBeNull();
    expect(hasCloudEnv()).toBe(false);
  });

  it('returns the url when it is https', () => {
    vi.stubEnv('VITE_DEXIE_CLOUD_URL', 'https://db.dexie.cloud');
    expect(cloudDatabaseUrl()).toBe('https://db.dexie.cloud');
    expect(hasCloudEnv()).toBe(true);
  });

  describe('cloudFlagFromEnv', () => {
    it('is false when unset', () => {
      vi.stubEnv('VITE_CLOUD_SYNC_FLAG', '');
      expect(cloudFlagFromEnv()).toBe(false);
    });

    it('is true only for the literal "on"', () => {
      vi.stubEnv('VITE_CLOUD_SYNC_FLAG', 'on');
      expect(cloudFlagFromEnv()).toBe(true);
    });

    it('is false for any other value', () => {
      vi.stubEnv('VITE_CLOUD_SYNC_FLAG', 'true');
      expect(cloudFlagFromEnv()).toBe(false);
    });
  });
});
