import { db as appDb } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import type { Space } from '@/db/schema';
import { invariant } from '@/lib/invariant';
import type { ScopeMember } from 'writer-sync/core';
import { ScopeRole } from 'writer-sync/core';
import type { DexieRow } from './dexieRow';
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
 *
 * Role names are only names to the server: their permissions come from role
 * definitions provisioned on the deployment (see
 * https://dexie.org/docs/cloud/access-control#roles), and none are provisioned
 * yet. Until they are, an `editor` or `owner` grant syncs but cannot write —
 * provisioning belongs to the same pre-UI work as key delivery above.
 */

/** The realm a space is shared into, or a refusal if it is not shared. */
const sharedRealmOf = async (spaceId: string, db: LoremDB): Promise<string> => {
  // Realm binding lives on the persisted adapter row, never the domain type.
  const space: DexieRow<Space> | undefined = await db.spaces.get(spaceId);
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

/** Least privileged first — ambiguity must never resolve upwards. */
const ROLE_PRECEDENCE = [
  ScopeRole.Viewer,
  ScopeRole.Editor,
  ScopeRole.Owner,
] as const;

const isScopeRole = (value: string): value is ScopeRole =>
  (Object.values(ScopeRole) as string[]).includes(value);

/**
 * Parse the synced `roles` array into the contract's single role. The rows are
 * synced state — the server or another device wrote them — so the names cross
 * a trust boundary and are parsed, never cast: an unrecognised name counts for
 * nothing, several recognised names resolve to the least privileged, and no
 * role at all means viewer — the least a grant can mean.
 */
const roleOf = (roles: readonly string[] | undefined): ScopeRole => {
  const recognised = (roles ?? []).filter(isScopeRole);
  return (
    ROLE_PRECEDENCE.find((role) => recognised.includes(role)) ??
    ScopeRole.Viewer
  );
};

const memberOf = (row: {
  id: string;
  email?: string;
  roles?: string[];
}): ScopeMember => ({
  id: row.id,
  email: row.email ?? '',
  role: roleOf(row.roles),
});

/**
 * Invite someone to a shared space's realm. Refuses a duplicate: a second row
 * for the same address would leave two grants to reconcile, and removing one
 * would appear to revoke access while the other still granted it.
 *
 * The refusal is a local read-then-write, so it only guards this device:
 * two devices adding the same address concurrently each mint a distinct
 * member id and both rows survive sync. Until a server-side uniqueness rule
 * exists, revocation UI must treat every row for the address as the grant.
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
 * Change what a member may do. A keyed update patches only `roles`: the
 * members table is addon-managed and unencrypted (it is not in
 * `ROW_ENVELOPE_TABLES`, so the encryption middleware passes it through), and the
 * server maintains invitation state on the row (`userId`, `accepted`,
 * `rejected`) that a whole-row put would overwrite with a stale read.
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
  await db.members.update(memberId, { roles: [role] });
};
