import { describe, it, expect } from 'vitest';
import { generateMemberKeys, memberPublicOf, type MemberKeys } from './crypto/memberKeys';
import type { Role } from './crypto/envelope';
import {
  signRoster,
  verifyRoster,
  currentContentEpoch,
  roleOf,
  type RosterBody,
  type RosterMember,
} from './roster';

const roomId = 'room-1';

const memberOf = async (keys: MemberKeys, name: string, role: Role): Promise<RosterMember> => {
  const pub = await memberPublicOf(keys, name);
  return { ...pub, role, addedAt: 1_000 };
};

const body = (over: Partial<RosterBody> & Pick<RosterBody, 'members' | 'signedBy'>): RosterBody => ({
  roomId,
  version: 1,
  contentEpoch: 1,
  ...over,
});

describe('roster', () => {
  it('verifies a self-signed genesis roster (v1)', async () => {
    const owner = await generateMemberKeys('owner');
    const roster = await signRoster(
      owner,
      body({ members: [await memberOf(owner, 'Owner', 'owner')], signedBy: 'owner' }),
    );
    expect(await verifyRoster(null, roster)).toBe(true);
  });

  it('supersedes with a higher-version roster signed by an owner', async () => {
    const owner = await generateMemberKeys('owner');
    const writer = await generateMemberKeys('writer');
    const prev = await signRoster(
      owner,
      body({ members: [await memberOf(owner, 'Owner', 'owner')], signedBy: 'owner' }),
    );
    const next = await signRoster(
      owner,
      body({
        version: 2,
        members: [await memberOf(owner, 'Owner', 'owner'), await memberOf(writer, 'Writer', 'writer')],
        signedBy: 'owner',
      }),
    );
    expect(await verifyRoster(prev, next)).toBe(true);
  });

  it('rejects a roster signed by a non-owner', async () => {
    const owner = await generateMemberKeys('owner');
    const writer = await generateMemberKeys('writer');
    const members = [await memberOf(owner, 'Owner', 'owner'), await memberOf(writer, 'Writer', 'writer')];
    const prev = await signRoster(owner, body({ members, signedBy: 'owner' }));
    const forged = await signRoster(writer, body({ version: 2, members, signedBy: 'writer' }));
    expect(await verifyRoster(prev, forged)).toBe(false);
  });

  it('rejects a version that does not increase', async () => {
    const owner = await generateMemberKeys('owner');
    const members = [await memberOf(owner, 'Owner', 'owner')];
    const prev = await signRoster(owner, body({ members, signedBy: 'owner' }));
    const stale = await signRoster(owner, body({ version: 1, members, signedBy: 'owner' }));
    expect(await verifyRoster(prev, stale)).toBe(false);
  });

  it('rejects an illegal role transition (a writer promoting themselves to owner)', async () => {
    const owner = await generateMemberKeys('owner');
    const writer = await generateMemberKeys('writer');
    const prev = await signRoster(
      owner,
      body({
        members: [await memberOf(owner, 'Owner', 'owner'), await memberOf(writer, 'Writer', 'writer')],
        signedBy: 'owner',
      }),
    );
    const selfPromote = await signRoster(
      writer,
      body({
        version: 2,
        members: [await memberOf(owner, 'Owner', 'owner'), await memberOf(writer, 'Writer', 'owner')],
        signedBy: 'writer',
      }),
    );
    expect(await verifyRoster(prev, selfPromote)).toBe(false);
  });

  it('reports the current content epoch and a member role', async () => {
    const owner = await generateMemberKeys('owner');
    const roster = await signRoster(
      owner,
      body({ contentEpoch: 7, members: [await memberOf(owner, 'Owner', 'owner')], signedBy: 'owner' }),
    );
    expect(currentContentEpoch(roster)).toBe(7);
    expect(roleOf(roster, 'owner')).toBe('owner');
    expect(roleOf(roster, 'stranger')).toBeNull();
  });
});
