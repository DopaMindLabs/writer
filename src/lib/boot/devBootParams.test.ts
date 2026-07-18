import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/db/seed', () => ({ resetAndReseed: vi.fn(async () => {}) }));

const { applyDevBootParams } = await import('./devBootParams');
const { resetAndReseed } = await import('@/db/seed');
const { keyMismatchState } = await import('@/lib/cloud/crypto/keyMismatch');
const { keylessLockState } = await import('@/lib/cloud/crypto/keylessLock');

describe('applyDevBootParams', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    vi.mocked(resetAndReseed).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    keyMismatchState.set(false);
    keylessLockState.set(false);
  });

  it('strips the reseed param but preserves the hash route', async () => {
    window.history.replaceState({}, '', '/?reseed=1#/settings?tab=account');
    await applyDevBootParams();
    expect(resetAndReseed).toHaveBeenCalledTimes(1);
    expect(window.location.search).not.toContain('reseed');
    expect(window.location.hash).toBe('#/settings?tab=account');
  });

  it('preserves the hash while stripping a cloud-mismatch param', async () => {
    window.history.replaceState({}, '', '/?cloud-mismatch=1#/space/s1/write');
    await applyDevBootParams();
    expect(window.location.search).not.toContain('cloud-mismatch');
    expect(window.location.hash).toBe('#/space/s1/write');
    expect(keyMismatchState.current()).toBe(true);
  });

  it('preserves the hash while stripping a cloud-keyless param', async () => {
    window.history.replaceState({}, '', '/?cloud-keyless=1#/help');
    await applyDevBootParams();
    expect(window.location.search).not.toContain('cloud-keyless');
    expect(window.location.hash).toBe('#/help');
    expect(keylessLockState.current()).toBe(true);
  });

  it('is a no-op outside dev/e2e builds', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_E2E', '');
    window.history.replaceState({}, '', '/?reseed=1#/settings');
    await applyDevBootParams();
    expect(resetAndReseed).not.toHaveBeenCalled();
    // The hash route is untouched.
    expect(window.location.hash).toBe('#/settings');
  });
});
