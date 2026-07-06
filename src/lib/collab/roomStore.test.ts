import { describe, it, expect, beforeEach } from 'vitest';
import { generateContentKey } from './crypto/contentKey';
import { generateMemberKeys, memberPublicOf } from './crypto/memberKeys';
import type { Roster } from './roster';
import {
  saveContentKey,
  loadContentKey,
  saveRoster,
  loadRoster,
  forgetRoom,
} from './roomStore';

const buildRoster = async (): Promise<Roster> => {
  const owner = await generateMemberKeys('owner');
  const pub = await memberPublicOf(owner, 'Owner');
  return {
    roomId: 'room-1',
    version: 1,
    contentEpoch: 1,
    members: [{ ...pub, role: 'owner', addedAt: 1 }],
    signedBy: 'owner',
    sig: new Uint8Array([1, 2, 3]),
  };
};

describe('roomStore', () => {
  beforeEach(async () => {
    await forgetRoom('room-1');
  });

  it('round-trips a content key that still encrypts and decrypts', async () => {
    const key = await generateContentKey();
    await saveContentKey('room-1', key);
    const loaded = await loadContentKey('room-1');
    expect(loaded).not.toBeNull();

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const pt = new TextEncoder().encode('probe');
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pt);
    const back = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, loaded!, ct);
    expect(new TextDecoder().decode(back)).toBe('probe');
  });

  it('round-trips the signed roster including its byte fields', async () => {
    const roster = await buildRoster();
    await saveRoster('room-1', roster);
    const loaded = await loadRoster('room-1');
    expect(loaded?.version).toBe(1);
    expect(loaded?.members[0].role).toBe('owner');
    expect([...(loaded?.sig ?? [])]).toEqual([1, 2, 3]);
  });

  it('returns null for an unknown room', async () => {
    expect(await loadContentKey('missing')).toBeNull();
    expect(await loadRoster('missing')).toBeNull();
  });

  it('forgets a room, clearing both content key and roster', async () => {
    await saveContentKey('room-1', await generateContentKey());
    await saveRoster('room-1', await buildRoster());
    await forgetRoom('room-1');
    expect(await loadContentKey('room-1')).toBeNull();
    expect(await loadRoster('room-1')).toBeNull();
  });
});
