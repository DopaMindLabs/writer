import { describe, it, expect } from 'vitest';
import { invariant } from '@/lib/invariant';
import { generateMemberKeys, memberPublicOf, signBytes, verifyBytes } from './memberKeys';
import { saveMemberKeys, loadMemberKeys, forgetMemberKeys } from './keystore';

describe('collab keystore', () => {
  it('round-trips usable member keys (proved by signing after reload)', async () => {
    const keys = await generateMemberKeys('author-1');
    await saveMemberKeys('room-a', keys);

    const loaded = await loadMemberKeys('room-a');
    invariant(loaded, 'expected the saved member keys to load');

    const data = new Uint8Array([1, 2, 3]);
    const sig = new Uint8Array(await signBytes(loaded, data));
    const pub = await memberPublicOf(loaded, 'Writer');
    expect(await verifyBytes(pub, sig, data)).toBe(true);
  });

  it('returns null for a room this device has not joined', async () => {
    expect(await loadMemberKeys('room-never-joined')).toBeNull();
  });

  it('forgets a room’s keys', async () => {
    const keys = await generateMemberKeys('author-2');
    await saveMemberKeys('room-b', keys);
    await forgetMemberKeys('room-b');
    expect(await loadMemberKeys('room-b')).toBeNull();
  });
});
