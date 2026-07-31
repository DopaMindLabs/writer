import { describe, it, expect } from 'vitest';
import { db } from '@/db/db';
import {
  PRESENCE_HUES,
  defaultProfile,
  getProfile,
  updateProfile,
} from './profile';

describe('local profile', () => {
  it('creates a default profile once and reuses it', async () => {
    const first = await getProfile();
    expect(first.authorId).toBeTruthy();
    expect(first.displayName).toBe('');
    expect(PRESENCE_HUES).toContain(first.presenceHue);
    expect(await db.meta.count()).toBe(1);

    const second = await getProfile();
    expect(second.authorId).toBe(first.authorId);
    expect(await db.meta.count()).toBe(1);
  });

  it('gives a fresh default a deterministic hue from its authorId', () => {
    const p = defaultProfile();
    expect(PRESENCE_HUES).toContain(p.presenceHue);
  });

  it('keeps authorId stable while updating name and hue', async () => {
    const { authorId } = await getProfile();
    await updateProfile({ displayName: 'Ada', presenceHue: 'presence-3' });
    const updated = await getProfile();
    expect(updated.authorId).toBe(authorId);
    expect(updated.displayName).toBe('Ada');
    expect(updated.presenceHue).toBe('presence-3');
  });

  it('repairs an invalid stored value and rewrites it', async () => {
    await db.meta.put({
      key: 'profile',
      value: { authorId: 42, displayName: null, presenceHue: 'presence-9' },
    });
    const healed = await getProfile();
    expect(typeof healed.authorId).toBe('string');
    expect(healed.authorId.length).toBeGreaterThan(0);
    expect(healed.displayName).toBe('');
    expect(PRESENCE_HUES).toContain(healed.presenceHue);

    // The healed value is persisted, so a second read is stable.
    const again = await getProfile();
    expect(again).toEqual(healed);
  });

  it('keeps both fields when concurrent edits touch different fields', async () => {
    await getProfile();
    await Promise.all([
      updateProfile({ displayName: 'Ada' }),
      updateProfile({ presenceHue: 'presence-4' }),
    ]);
    const merged = await getProfile();
    expect(merged.displayName).toBe('Ada');
    expect(merged.presenceHue).toBe('presence-4');
  });

  it('repairs a completely non-object stored value', async () => {
    await db.meta.put({ key: 'profile', value: 'garbage' });
    const healed = await getProfile();
    expect(typeof healed.authorId).toBe('string');
    expect(PRESENCE_HUES).toContain(healed.presenceHue);
  });
});
