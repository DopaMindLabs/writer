import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  cloudDatabaseUrl,
  cloudFlagFromEnv,
  deviceRefreshIntervalMs,
  deviceStaleAfterMs,
  hasCloudEnv,
} from './env';

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

  describe('device registry durations', () => {
    const FALLBACK = 60_000;

    it('falls back when unset', () => {
      vi.stubEnv('VITE_DEVICE_REFRESH_SECONDS', '');
      vi.stubEnv('VITE_DEVICE_STALE_SECONDS', '');
      expect(deviceRefreshIntervalMs(FALLBACK)).toBe(FALLBACK);
      expect(deviceStaleAfterMs(FALLBACK)).toBe(FALLBACK);
    });

    it('reads seconds and returns milliseconds', () => {
      vi.stubEnv('VITE_DEVICE_REFRESH_SECONDS', '1800');
      vi.stubEnv('VITE_DEVICE_STALE_SECONDS', '3600');
      expect(deviceRefreshIntervalMs(FALLBACK)).toBe(1_800_000);
      expect(deviceStaleAfterMs(FALLBACK)).toBe(3_600_000);
    });

    it('falls back rather than throwing on a malformed value', () => {
      // A mistyped deployment variable must never brick the app: the defaults are
      // always safe, so an unusable override is ignored, not fatal.
      vi.stubEnv('VITE_DEVICE_REFRESH_SECONDS', 'half an hour');
      expect(deviceRefreshIntervalMs(FALLBACK)).toBe(FALLBACK);
    });

    it('falls back on a non-positive value', () => {
      // Zero would mean "refresh on every sync" — the very loop this guards.
      vi.stubEnv('VITE_DEVICE_REFRESH_SECONDS', '0');
      vi.stubEnv('VITE_DEVICE_STALE_SECONDS', '-1');
      expect(deviceRefreshIntervalMs(FALLBACK)).toBe(FALLBACK);
      expect(deviceStaleAfterMs(FALLBACK)).toBe(FALLBACK);
    });
  });
});
