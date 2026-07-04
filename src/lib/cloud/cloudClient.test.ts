import { describe, it, expect } from 'vitest';
import {
  cloudSyncState,
  cloudUserInteraction,
  cloudCurrentUser,
  signInToCloud,
  signOutOfCloud,
} from './cloudClient';

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
