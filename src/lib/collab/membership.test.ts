import { describe, it, expect } from 'vitest';
import { generateMemberKeys, memberPublicOf, type MemberKeys } from './crypto/memberKeys';
import { generateContentKey } from './crypto/contentKey';
import {
  sealFrame,
  openFrame,
  FrameAuthError,
  FrameIntegrityError,
  type AuthorResolver,
} from './crypto/envelope';
import { utf8 } from './crypto/bytes';
import { verifyRoster, type Roster } from './roster';
import { genesisRoster, admitMember, removeMemberRekey, acceptWrappedKey } from './membership';

const ROOM = 'room';

const resolverFor =
  (roster: Roster): AuthorResolver =>
  (id) => {
    const member = roster.members.find((entry) => entry.authorId === id);
    return member ? { pub: member, role: member.role } : null;
  };

const ownerAgree = async (owner: MemberKeys): Promise<Uint8Array> =>
  (await memberPublicOf(owner, 'Owner')).agreePubRaw;

describe('membership', () => {
  it('creates a verifiable genesis roster', async () => {
    const owner = await generateMemberKeys('owner');
    const roster = await genesisRoster(owner, ROOM, 'Owner', 1);
    expect(roster.version).toBe(1);
    expect(await verifyRoster(null, roster)).toBe(true);
  });

  it('admits a member and gives them a usable content key', async () => {
    const owner = await generateMemberKeys('owner');
    const writer = await generateMemberKeys('writer');
    const roster = await genesisRoster(owner, ROOM, 'Owner', 1);
    const contentKey = await generateContentKey();
    const writerPub = await memberPublicOf(writer, 'Writer');

    const { roster: r2, wrapped } = await admitMember({ owner, roster, contentKey }, writerPub, 'writer', 2);
    expect(await verifyRoster(roster, r2)).toBe(true);

    // The admitted writer unwraps the key and encrypts an update the owner opens.
    const writerKey = await acceptWrappedKey(writer, await ownerAgree(owner), wrapped);
    const env = await sealFrame(writerKey, writer, { roomId: ROOM, type: 'update', epoch: r2.contentEpoch }, utf8('hi'));
    const plain = await openFrame(contentKey, resolverFor(r2), env);
    expect(new TextDecoder().decode(plain)).toBe('hi');
  });

  it('revokes a member: epoch bumps, remaining members get the fresh key, the removed member cannot', async () => {
    const owner = await generateMemberKeys('owner');
    const removed = await generateMemberKeys('removed');
    const kept = await generateMemberKeys('kept');
    const contentKey = await generateContentKey();

    let roster = await genesisRoster(owner, ROOM, 'Owner', 1);
    const admit1 = await admitMember({ owner, roster, contentKey }, await memberPublicOf(removed, 'Removed'), 'writer', 2);
    roster = admit1.roster;
    const removedKey = await acceptWrappedKey(removed, await ownerAgree(owner), admit1.wrapped);
    const admit2 = await admitMember({ owner, roster, contentKey }, await memberPublicOf(kept, 'Kept'), 'writer', 3);
    roster = admit2.roster;

    const { roster: r4, contentKey: freshKey, wrapped } = await removeMemberRekey({ owner, roster, contentKey }, 'removed');
    expect(r4.contentEpoch).toBe(roster.contentEpoch + 1);
    expect(r4.members.some((m) => m.authorId === 'removed')).toBe(false);
    expect(await verifyRoster(roster, r4)).toBe(true);

    // A new-epoch frame the owner writes with the fresh key.
    const frame = await sealFrame(freshKey, owner, { roomId: ROOM, type: 'update', epoch: r4.contentEpoch }, utf8('secret'));

    // The kept member is re-wrapped the fresh key and can read it.
    const keptWrapped = wrapped.find((w) => w.recipient === 'kept');
    expect(keptWrapped).toBeDefined();
    const keptKey = await acceptWrappedKey(kept, await ownerAgree(owner), keptWrapped!);
    expect(new TextDecoder().decode(await openFrame(keptKey, resolverFor(r4), frame))).toBe('secret');

    // The removed member holds only the old key — the new epoch is undecryptable.
    await expect(openFrame(removedKey, resolverFor(r4), frame)).rejects.toThrow(FrameIntegrityError);
  });

  it('drops a removed member’s future update (absent from the roster)', async () => {
    const owner = await generateMemberKeys('owner');
    const removed = await generateMemberKeys('removed');
    const contentKey = await generateContentKey();
    let roster = await genesisRoster(owner, ROOM, 'Owner', 1);
    const admit = await admitMember({ owner, roster, contentKey }, await memberPublicOf(removed, 'Removed'), 'writer', 2);
    roster = admit.roster;
    const removedKey = await acceptWrappedKey(removed, await ownerAgree(owner), admit.wrapped);

    const { roster: r3, contentKey: freshKey } = await removeMemberRekey({ owner, roster, contentKey }, 'removed');

    // The removed member forges an update on the old key; the owner drops it —
    // the author is no longer in the roster.
    const forged = await sealFrame(removedKey, removed, { roomId: ROOM, type: 'update', epoch: admit.roster.contentEpoch }, utf8('nope'));
    await expect(openFrame(freshKey, resolverFor(r3), forged)).rejects.toThrow(FrameAuthError);
  });
});
