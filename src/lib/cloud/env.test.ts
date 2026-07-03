import { describe, it, expect, afterEach, vi } from 'vitest';
import { cloudDatabaseUrl, hasCloudEnv } from './env';

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
});
