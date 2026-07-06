/**
 * A join request: how an invited device asks an owner to admit it. The invitee
 * generates its own {@link MemberKeys} locally and posts its public half plus an
 * HMAC over that half, keyed by the link's one-time invite secret. An owner
 * verifies the HMAC ({@link verifyJoinRequest}) to confirm the request came from
 * a holder of the invite, then admits the member and rotates/wraps the content
 * key (Task 10). The invite secret is single-use — the owner records consumed
 * secrets in the `shares` row so a leaked link cannot admit two members.
 *
 * The HMAC binds the **room id** alongside the member's identity, so a request
 * captured for one room cannot be replayed to admit the same key elsewhere.
 */
import { memberPublicOf, type MemberKeys, type MemberPublic } from './crypto/memberKeys';
import { asBuffer, utf8, concatLengthPrefixed } from './crypto/bytes';
import type { InviteLink } from './invite';

/** An invitee's admission request: their public identity, MAC'd under the invite secret. */
export interface JoinRequest {
  roomId: string;
  member: MemberPublic;
  mac: Uint8Array;
}

/** Canonical bytes the invite secret authenticates — room id bound in. */
const joinRequestBytes = (roomId: string, member: MemberPublic): Uint8Array =>
  concatLengthPrefixed([
    utf8('lipsum-collab-join:1'),
    utf8(roomId),
    utf8(member.authorId),
    utf8(member.displayName),
    utf8(member.signAlg),
    member.signPubRaw,
    utf8(member.agreeAlg),
    member.agreePubRaw,
  ]);

const hmacKey = (secret: Uint8Array): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', asBuffer(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);

/** Build a signed join request for an invite, from this device's keys. */
export const buildJoinRequest = async (
  invite: InviteLink,
  keys: MemberKeys,
  displayName: string,
): Promise<JoinRequest> => {
  const member = await memberPublicOf(keys, displayName);
  const key = await hmacKey(invite.inviteSecret);
  const mac = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, asBuffer(joinRequestBytes(invite.roomId, member))),
  );
  return { roomId: invite.roomId, member, mac };
};

/** Verify a join request's MAC against the invite secret an owner holds. */
export const verifyJoinRequest = async (
  inviteSecret: Uint8Array,
  req: JoinRequest,
): Promise<boolean> => {
  const key = await hmacKey(inviteSecret);
  return crypto.subtle.verify(
    'HMAC',
    key,
    asBuffer(req.mac),
    asBuffer(joinRequestBytes(req.roomId, req.member)),
  );
};
