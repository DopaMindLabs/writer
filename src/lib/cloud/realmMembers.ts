import { db as appDb } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import { invariant } from '@/lib/invariant';
import type { ScopeMember } from '@/lib/syncProviders/types';
import { ScopeRole } from '@/lib/syncProviders/types';
import { isShared, privateRealmOf } from './spaceRealm';

/**
 * Membership of a shared space's realm.
 *
 * A member row *is* the grant: Dexie Cloud replicates the realm's rows to
 * whoever holds a member row for it, and `invite: true` is what turns that row
 * into an invitation the recipient sees on `db.cloud.invites` and accepts.
 * There is no app-wide membership — access is per realm, one row per person.
 *
 * Ids come from `members.newId()` rather than the app's own `newId()`: the table
 * is declared `@id`, so the addon owns the format (a `mmb`-prefixed key) and
 * generates one the server will accept.
 *
 * These operations only write rows. They do not deliver an invitation, and they
 * do not give the recipient a content key — the key model is per account, so a
 * member currently syncs ciphertext they cannot read. See the cross-user key
 * delivery question before any of this reaches a UI.
 */

/** The realm a space is shared into, or a refusal if it is not shared. */
const sharedRealmOf = async (spaceId: string, db: LoremDB): Promise<string> => {
  const space = await db.spaces.get(spaceId);
  invariant(space, `Unknown space: ${spaceId}`);
  const { realmId } = space;
  // The addon stamps every row with the owner's private realm, so "not shared"
  // is that value rather than an absent field.
  invariant(
    realmId !== undefined && isShared(realmId, privateRealmOf(db)),
    `Space is not shared, so it has no realm to grant access to: ${spaceId}`,
  );
  return realmId;
};

const memberOf = (row: {
  id: string;
  email?: string;
  roles?: string[];
}): ScopeMember => ({
  id: row.id,
  email: row.email ?? '',
  // A member with no role recorded is a viewer: the least the grant can mean.
  role: (row.roles?.[0] as ScopeRole | undefined) ?? ScopeRole.Viewer,
});

/**
 * Invite someone to a shared space's realm. Refuses a duplicate: a second row
 * for the same address would leave two grants to reconcile, and removing one
 * would appear to revoke access while the other still granted it.
 */
export const addSpaceMember = async (options: {
  spaceId: string;
  email: string;
  role: ScopeRole;
  db?: LoremDB;
}): Promise<string> => {
  const { spaceId, email, role, db = appDb } = options;
  const realmId = await sharedRealmOf(spaceId, db);

  const existing = await db.members.where({ realmId, email }).first();
  invariant(!existing, `${email} is already a member of this space`);

  const id = db.members.newId();
  await db.members.add({ id, realmId, email, invite: true, roles: [role] });
  return id;
};

/** Everyone holding a grant on the space's realm. */
export const listSpaceMembers = async (
  spaceId: string,
  db: LoremDB = appDb,
): Promise<ScopeMember[]> => {
  const realmId = await sharedRealmOf(spaceId, db);
  const rows = await db.members.where({ realmId }).toArray();
  return rows.map(memberOf);
};

/**
 * Revoke a grant. Deleting the row is the revocation — the server stops
 * replicating the realm to that person on the next sync.
 */
export const removeSpaceMember = async (
  spaceId: string,
  memberId: string,
  db: LoremDB = appDb,
): Promise<void> => {
  const realmId = await sharedRealmOf(spaceId, db);
  const member = await db.members.get(memberId);
  invariant(member, `Unknown member: ${memberId}`);
  invariant(
    member.realmId === realmId,
    `Member ${memberId} does not belong to this space`,
  );
  await db.members.delete(memberId);
};

/**
 * Change what a member may do. Written as a whole-row put rather than a cursor
 * update: cursors bypass the encryption middleware (see `crypto/middleware.ts`),
 * and the repo's guard test rejects them in production code.
 */
export const setSpaceMemberRole = async (options: {
  spaceId: string;
  memberId: string;
  role: ScopeRole;
  db?: LoremDB;
}): Promise<void> => {
  const { spaceId, memberId, role, db = appDb } = options;
  const realmId = await sharedRealmOf(spaceId, db);
  const member = await db.members.get(memberId);
  invariant(member, `Unknown member: ${memberId}`);
  invariant(
    member.realmId === realmId,
    `Member ${memberId} does not belong to this space`,
  );
  await db.members.put({ ...member, roles: [role] });
};
