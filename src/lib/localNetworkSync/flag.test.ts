import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LOCAL_NETWORK_SYNC_FLAG_KEY,
  LOCAL_NETWORK_SYNC_SETTING_KEY,
  readLocalNetworkSyncFlag,
  readLocalNetworkSyncSetting,
  writeLocalNetworkSyncSetting,
  applyLocalNetworkSyncFlagFromUrl,
  isLocalNetworkSyncAvailable,
  canStartLocalNetworkSync,
} from './flag';

const setUrl = (search: string, hash = '#/settings?tab=account'): void => {
  window.history.replaceState(null, '', `/${search}${hash}`);
};

describe('local-network sync flag', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults both opt-ins to off', () => {
    expect(readLocalNetworkSyncFlag()).toBe(false);
    expect(readLocalNetworkSyncSetting()).toBe(false);
  });

  it('persists and strips ?local-network-sync=on', () => {
    setUrl('?local-network-sync=on');
    applyLocalNetworkSyncFlagFromUrl();
    expect(readLocalNetworkSyncFlag()).toBe(true);
    expect(window.location.search).not.toContain('local-network-sync');
  });

  it('clears the hidden flag on ?local-network-sync=off', () => {
    localStorage.setItem(LOCAL_NETWORK_SYNC_FLAG_KEY, 'on');
    setUrl('?local-network-sync=off');
    applyLocalNetworkSyncFlagFromUrl();
    expect(readLocalNetworkSyncFlag()).toBe(false);
    expect(window.location.search).not.toContain('local-network-sync');
  });

  it('ignores unknown flag values', () => {
    localStorage.setItem(LOCAL_NETWORK_SYNC_FLAG_KEY, 'on');
    setUrl('?local-network-sync=maybe');
    applyLocalNetworkSyncFlagFromUrl();
    expect(readLocalNetworkSyncFlag()).toBe(true);
  });

  it('preserves other query params and the hash route when stripping', () => {
    setUrl('?foo=bar&local-network-sync=on', '#/settings?tab=account');
    applyLocalNetworkSyncFlagFromUrl();
    expect(window.location.search).toContain('foo=bar');
    expect(window.location.search).not.toContain('local-network-sync');
    expect(window.location.hash).toBe('#/settings?tab=account');
  });

  it('persists the Universal Settings opt-in independently', () => {
    writeLocalNetworkSyncSetting(true);
    expect(readLocalNetworkSyncSetting()).toBe(true);
    writeLocalNetworkSyncSetting(false);
    expect(readLocalNetworkSyncSetting()).toBe(false);
  });

  it('shows the beta UI only when the build and device gates are on', () => {
    vi.stubEnv('VITE_LOCAL_NETWORK_SYNC', 'true');
    localStorage.setItem(LOCAL_NETWORK_SYNC_FLAG_KEY, 'on');
    expect(isLocalNetworkSyncAvailable()).toBe(true);
  });

  it('keeps the beta UI hidden when the build gate is off', () => {
    vi.stubEnv('VITE_LOCAL_NETWORK_SYNC', '');
    localStorage.setItem(LOCAL_NETWORK_SYNC_FLAG_KEY, 'on');
    expect(isLocalNetworkSyncAvailable()).toBe(false);
  });

  it('blocks sync start until the user setting is on', () => {
    vi.stubEnv('VITE_LOCAL_NETWORK_SYNC', 'true');
    localStorage.setItem(LOCAL_NETWORK_SYNC_FLAG_KEY, 'on');
    expect(canStartLocalNetworkSync()).toBe(false);
    localStorage.setItem(LOCAL_NETWORK_SYNC_SETTING_KEY, 'on');
    expect(canStartLocalNetworkSync()).toBe(true);
  });

  it('swallows storage exceptions when reading', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    expect(readLocalNetworkSyncFlag()).toBe(false);
    expect(readLocalNetworkSyncSetting()).toBe(false);
    spy.mockRestore();
  });
});
