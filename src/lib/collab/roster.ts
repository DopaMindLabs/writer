/**
 * The signed member roster: the room's source of truth for *who is a member, with
 * which keys, in which role*, and for *which content epoch is current*. Every
 * document update and every roster is verified against the current roster before
 * it is applied, so the roster is the trust anchor for the whole room.
 *
 * A roster is authorised by an **owner** signing over its canonical bytes.
 * Version 1 is a self-signed genesis (trust is bootstrapped by the invite link,
 * Task 5); every later version must be signed by an owner already present in the
 * previous roster and must strictly increase the version, so a reader or a
 * removed member can never forge a supersession. Members are serialised in a
 * fixed order (by `authorId`) so signing and verification bind byte-identical
 * content regardless of array order.
 */
import { signBytes, verifyBytes, type MemberKeys, type MemberPublic } from './crypto/memberKeys';
import { utf8, u32, concatLengthPrefixed } from './crypto/bytes';
import type { Role } from './crypto/envelope';

/** A roster entry: a member's public half plus their room role and join time. */
export interface RosterMember extends MemberPublic {
  role: Role;
  addedAt: number;
}

/** The signed, versioned membership of one room. */
export interface Roster {
  roomId: string;
  version: number;
  contentEpoch: number;
  members: RosterMember[];
  signedBy: string;
  sig: Uint8Array;
}

/** The signable body of a roster — everything but the signature. */
export type RosterBody = Omit<Roster, 'sig'>;

const memberBytes = (m: RosterMember): Uint8Array[] => [
  utf8(m.authorId),
  utf8(m.displayName),
  utf8(m.signAlg),
  m.signPubRaw,
  utf8(m.agreeAlg),
  m.agreePubRaw,
  utf8(m.role),
  u32(m.addedAt),
];

/** Canonical, order-independent bytes an owner signs over. */
const rosterSignedBytes = (body: RosterBody): Uint8Array => {
  const ordered = [...body.members].sort((a, b) => (a.authorId < b.authorId ? -1 : a.authorId > b.authorId ? 1 : 0));
  return concatLengthPrefixed([
    utf8('lipsum-collab-roster:1'),
    utf8(body.roomId),
    u32(body.version),
    u32(body.contentEpoch),
    utf8(body.signedBy),
    u32(ordered.length),
    ...ordered.flatMap(memberBytes),
  ]);
};

const ownerNamed = (r: Roster | RosterBody, authorId: string): RosterMember | null =>
  r.members.find((m) => m.authorId === authorId && m.role === 'owner') ?? null;

/** Sign a roster body as an owner; the signer must be `body.signedBy`. */
export const signRoster = async (owner: MemberKeys, body: RosterBody): Promise<Roster> => {
  const sig = new Uint8Array(await signBytes(owner, rosterSignedBytes(body)));
  return { ...body, sig };
};

/**
 * Verify that `next` legitimately supersedes `prev` (or is a valid genesis when
 * `prev` is `null`): signed by an owner, strictly newer, signature valid.
 */
export const verifyRoster = async (prev: Roster | null, next: Roster): Promise<boolean> => {
  if (prev === null) {
    if (next.version !== 1) return false;
    const genesisOwner = ownerNamed(next, next.signedBy);
    if (!genesisOwner) return false;
    return verifyBytes(genesisOwner, next.sig, rosterSignedBytes(next));
  }
  if (next.roomId !== prev.roomId) return false;
  if (next.version <= prev.version) return false;
  const owner = ownerNamed(prev, next.signedBy);
  if (!owner) return false;
  return verifyBytes(owner, next.sig, rosterSignedBytes(next));
};

/** The content epoch the roster's wrapped-key posts target. */
export const currentContentEpoch = (r: Roster): number => r.contentEpoch;

/** The role of a member in the room, or `null` if they are not a member. */
export const roleOf = (r: Roster, authorId: string): Role | null =>
  r.members.find((m) => m.authorId === authorId)?.role ?? null;
