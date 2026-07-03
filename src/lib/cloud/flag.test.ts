import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CLOUD_FLAG_KEY,
  readCloudFlag,
  applyCloudFlagFromUrl,
  isCloudSyncEnabled,
  markCloudProvisioned,
  wasCloudProvisioned,
} from './flag';

const setUrl = (search: string, hash = '#/writer'): void => {
  window.history.replaceState(null, '', `/${search}${hash}`);
};

describe('cloud flag', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to off', () => {
    expect(readCloudFlag()).toBe(false);
  });

  it('persists and strips ?cloud-sync=on', () => {
    setUrl('?cloud-sync=on');
    applyCloudFlagFromUrl();
    expect(readCloudFlag()).toBe(true);
    expect(window.location.search).not.toContain('cloud-sync');
  });

  it('clears the flag on ?cloud-sync=off', () => {
    localStorage.setItem(CLOUD_FLAG_KEY, 'on');
    setUrl('?cloud-sync=off');
    applyCloudFlagFromUrl();
    expect(readCloudFlag()).toBe(false);
    expect(window.location.search).not.toContain('cloud-sync');
  });

  it('ignores unknown values', () => {
    localStorage.setItem(CLOUD_FLAG_KEY, 'on');
    setUrl('?cloud-sync=maybe');
    applyCloudFlagFromUrl();
    expect(readCloudFlag()).toBe(true);
  });

  it('preserves other query params and the hash route when stripping', () => {
    setUrl('?foo=bar&cloud-sync=on', '#/s/s1/d/d1');
    applyCloudFlagFromUrl();
    expect(window.location.search).toContain('foo=bar');
    expect(window.location.search).not.toContain('cloud-sync');
    expect(window.location.hash).toBe('#/s/s1/d/d1');
  });

  it('swallows storage exceptions', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('storage blocked');
      });
    expect(readCloudFlag()).toBe(false);
    spy.mockRestore();
  });

  describe('isCloudSyncEnabled', () => {
    it('is true only when both env and flag are on', () => {
      vi.stubEnv('VITE_DEXIE_CLOUD_URL', 'https://db.dexie.cloud');
      localStorage.setItem(CLOUD_FLAG_KEY, 'on');
      expect(isCloudSyncEnabled()).toBe(true);
    });

    it('is false when the env is missing', () => {
      vi.stubEnv('VITE_DEXIE_CLOUD_URL', '');
      localStorage.setItem(CLOUD_FLAG_KEY, 'on');
      expect(isCloudSyncEnabled()).toBe(false);
    });

    it('is false when the flag is off', () => {
      vi.stubEnv('VITE_DEXIE_CLOUD_URL', 'https://db.dexie.cloud');
      expect(isCloudSyncEnabled()).toBe(false);
    });
  });

  describe('provisioned marker', () => {
    it('defaults to not provisioned', () => {
      expect(wasCloudProvisioned()).toBe(false);
    });

    it('records and reads the provisioned marker', () => {
      markCloudProvisioned();
      expect(wasCloudProvisioned()).toBe(true);
    });

    it('is independent of the beta flag', () => {
      markCloudProvisioned();
      localStorage.removeItem(CLOUD_FLAG_KEY);
      expect(readCloudFlag()).toBe(false);
      expect(wasCloudProvisioned()).toBe(true);
    });

    it('swallows storage exceptions when reading', () => {
      const spy = vi
        .spyOn(Storage.prototype, 'getItem')
        .mockImplementation(() => {
          throw new Error('storage blocked');
        });
      expect(wasCloudProvisioned()).toBe(false);
      spy.mockRestore();
    });
  });
});
