import { describe, it, expect } from 'vitest';
import { generateMemberKeys } from './crypto/memberKeys';
import { buildJoinRequest, verifyJoinRequest } from './joinRequest';
import type { InviteLink } from './invite';

const invite: InviteLink = {
  roomId: 'room-1',
  relayUrl: 'wss://relay.example',
  inviteSecret: new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]),
  role: 'writer',
};

describe('joinRequest', () => {
  it('verifies a join request built under the right invite secret', async () => {
    const keys = await generateMemberKeys('invitee');
    const req = await buildJoinRequest(invite, keys, 'Invitee');
    expect(req.roomId).toBe(invite.roomId);
    expect(req.member.authorId).toBe('invitee');
    expect(await verifyJoinRequest(invite.inviteSecret, req)).toBe(true);
  });

  it('rejects a tampered join request', async () => {
    const keys = await generateMemberKeys('invitee');
    const req = await buildJoinRequest(invite, keys, 'Invitee');
    const tampered = { ...req, member: { ...req.member, displayName: 'Impostor' } };
    expect(await verifyJoinRequest(invite.inviteSecret, tampered)).toBe(false);
  });

  it('rejects a request verified under the wrong invite secret', async () => {
    const keys = await generateMemberKeys('invitee');
    const req = await buildJoinRequest(invite, keys, 'Invitee');
    const wrongSecret = new Uint8Array([0, 0, 0, 0]);
    expect(await verifyJoinRequest(wrongSecret, req)).toBe(false);
  });

  it('does not verify a request replayed to a different room', async () => {
    const keys = await generateMemberKeys('invitee');
    const req = await buildJoinRequest(invite, keys, 'Invitee');
    const replayed = { ...req, roomId: 'room-2' };
    expect(await verifyJoinRequest(invite.inviteSecret, replayed)).toBe(false);
  });
});
