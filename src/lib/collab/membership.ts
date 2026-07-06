/**
 * Room membership transitions: the roster + content-key operations behind
 * admitting and removing collaborators. These are pure with respect to storage
 * and transport — they take the current room state and return the next roster
 * (and, for a removal, a fresh content key) plus the wrapped-key posts to publish.
 * The sharing facade persists the results and hands the posts to the relay.
 *
 * Admission does **not** rotate the content key: a newcomer just receives the
 * current key wrapped to them. Removal **must** rotate it — a new content epoch,
 * a fresh key re-wrapped to every remaining member — so the removed member keeps
 * only what they already received and can read nothing from the new epoch, and
 * their future signed updates are dropped for being absent from the roster.
 */
import { memberPublicOf, type MemberKeys, type MemberPublic } from './crypto/memberKeys';
import { generateContentKey } from './crypto/contentKey';
import { wrapContentKey, unwrapContentKey, type WrappedKey } from './crypto/keyWrap';
import { signRoster, type Roster, type RosterMember } from './roster';
import type { Role } from './crypto/envelope';

/** The owner-held state a membership change operates on. */
export interface MembershipContext {
  readonly owner: MemberKeys;
  readonly roster: Roster;
  readonly contentKey: CryptoKey;
}

/** Create a room's genesis roster: version 1, self-signed by the owner. */
export const genesisRoster = (
  owner: MemberKeys,
  roomId: string,
  displayName: string,
  now: number,
): Promise<Roster> =>
  memberPublicOf(owner, displayName).then((pub) =>
    signRoster(owner, {
      roomId,
      version: 1,
      contentEpoch: 1,
      members: [{ ...pub, role: 'owner', addedAt: now }],
      signedBy: owner.authorId,
    }),
  );

/** Admit a member: next roster version + the content key wrapped to them. */
export const admitMember = async (
  ctx: MembershipContext,
  member: MemberPublic,
  role: Role,
  now: number,
): Promise<{ roster: Roster; wrapped: WrappedKey }> => {
  const { owner, roster, contentKey } = ctx;
  const entry: RosterMember = { ...member, role, addedAt: now };
  const next = await signRoster(owner, {
    roomId: roster.roomId,
    version: roster.version + 1,
    contentEpoch: roster.contentEpoch,
    members: [...roster.members, entry],
    signedBy: owner.authorId,
  });
  const wrapped = await wrapContentKey(
    owner,
    member,
    { roomId: roster.roomId, epoch: roster.contentEpoch },
    contentKey,
  );
  return { roster: next, wrapped };
};

/**
 * Remove a member: a new roster without them at a bumped content epoch, a fresh
 * content key, and that key re-wrapped to every remaining non-owner member.
 */
export const removeMemberRekey = async (
  ctx: MembershipContext,
  authorId: string,
): Promise<{ roster: Roster; contentKey: CryptoKey; wrapped: WrappedKey[] }> => {
  const { owner, roster } = ctx;
  const remaining = roster.members.filter((member) => member.authorId !== authorId);
  const epoch = roster.contentEpoch + 1;
  const contentKey = await generateContentKey();
  const next = await signRoster(owner, {
    roomId: roster.roomId,
    version: roster.version + 1,
    contentEpoch: epoch,
    members: remaining,
    signedBy: owner.authorId,
  });
  const recipients = remaining.filter((member) => member.authorId !== owner.authorId);
  const wrapped = await Promise.all(
    recipients.map((member) =>
      wrapContentKey(owner, member, { roomId: roster.roomId, epoch }, contentKey),
    ),
  );
  return { roster: next, contentKey, wrapped };
};

/** Unwrap a content key posted to this device on admission. */
export const acceptWrappedKey = (
  self: MemberKeys,
  ownerAgreePub: Uint8Array,
  wrapped: WrappedKey,
): Promise<CryptoKey> => unwrapContentKey(self, ownerAgreePub, wrapped);
