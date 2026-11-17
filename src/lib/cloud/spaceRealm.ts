import type { Table } from 'dexie';
import { db as appDb } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import type { Space } from '@/db/schema';
import { invariant } from '@/lib/invariant';
import type { AccessScopeId } from 'writer-sync/core';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import { DEXIE_CLOUD_PROVIDER_ID } from './dexieCloudProviderId';
import type { DexieRow } from './dexieRow';

/**
 * Moving an access scope into its own Dexie realm, and back out again.
 *
 * `realmId` is the addon's access-control boundary and stays entirely inside
 * this adapter. Since the frame cutover it applies to a different set of rows:
 * materialised content tables are local projections that never leave the device,
 * so stamping them with a realm would achieve nothing. What replicates is the
 * operation journal — so a realm binds the scope's **frames**, and the scope's
 * binding is recorded in `syncProviderBindings` so frames written later inherit
 * it without re-reading Dexie's own tables.
 *
 * The realm exists; nothing here grants anyone else access to it. Membership
 * provisioning and cross-user key delivery remain absent (see `realmMembers`).
 */

/**
 * The realm a row sits in when it belongs to nobody but its owner. The addon
 * reports `'unauthorized'` until the user signs in and its rows are syncified.
 */
export const privateRealmOf = (db: LoremDB): string =>
  (db as unknown as { cloud?: { currentUserId?: string } }).cloud?.currentUserId ??
  UNAUTHORIZED;

/**
 * The addon reports this until a user signs in. Creating a realm in that state
 * mints one whose id *is* this value — the `realms` primary key is `realmId`,
 * and the access-control middleware stamps `realmId` on every written row — so
 * the "realm" would be the private realm and sharing would silently do nothing.
 */
const UNAUTHORIZED = 'unauthorized';

/** Whether a scope has been moved out of its owner's private realm. */
export const isShared = (realmId: string | undefined, privateRealm: string): boolean =>
  realmId !== undefined && realmId !== privateRealm;

/** The tables a scope transition writes: the journal plus the binding record. */
const tablesFor = (db: LoremDB) => [
  db.syncOperations,
  db.syncProviderBindings,
  db.realms,
  db.members,
];

/**
 * Stamp every already-enqueued frame for a scope with `realmId`.
 *
 * Frames are classified `already-wrapped`, so they carry no row envelope and can
 * be restamped in place — the ciphertext payload is untouched, which is what
 * makes this safe: the realm is provider routing, never part of what the frame
 * says. Must run inside a transaction covering the journal, so a half-stamped
 * scope cannot strand some of its operations outside the realm its peers read.
 *
 * Exported so the fan-out can be tested without a cloud account.
 */
export const restampScopeFrames = async (options: {
  db: LoremDB;
  accessScopeId: AccessScopeId;
  realmId: string;
}): Promise<number> => {
  const { db, accessScopeId, realmId } = options;
  // The adapter boundary: the *persisted* frame row is the neutral frame plus
  // Dexie's own metadata, and only this module may see that intersection.
  const journal: Table<DexieRow<EncryptedSyncFrame>, string> =
    db.table('syncOperations');
  const frames = await journal.where({ accessScopeId }).toArray();
  if (frames.length === 0) return 0;
  await journal.bulkPut(frames.map((frame) => ({ ...frame, realmId })));
  return frames.length;
};

/** Record (or clear) the scope's binding to this provider's external scope. */
const writeBinding = async (options: {
  db: LoremDB;
  scopeId: AccessScopeId;
  externalScopeId: string | undefined;
}): Promise<void> => {
  const { db, scopeId, externalScopeId } = options;
  if (externalScopeId === undefined) {
    await db.syncProviderBindings.delete([scopeId, DEXIE_CLOUD_PROVIDER_ID]);
    return;
  }
  await db.syncProviderBindings.put({
    scopeId,
    providerInstanceId: DEXIE_CLOUD_PROVIDER_ID,
    externalScopeId,
    enabled: true,
  });
};

/**
 * Give a scope its own realm and file its enqueued frames into it. Returns the
 * new realm id. The realm is named after the space so it is recognisable
 * wherever realms are listed.
 *
 * Refuses a scope that already has a realm: re-sharing would mint a second realm
 * and orphan the first, taking its members' access with it.
 */
export const createSpaceRealm = async (
  spaceId: string,
  db: LoremDB = appDb,
): Promise<string> => {
  const privateRealm = privateRealmOf(db);
  // Sharing is server-side access control: without an account there is no realm
  // to grant anyone access to, and the addon would mint one indistinguishable
  // from the private realm.
  invariant(
    privateRealm !== UNAUTHORIZED,
    'Cannot share a space while signed out of the cloud',
  );
  const space: DexieRow<Space> | undefined = await db.spaces.get(spaceId);
  invariant(space, `Cannot share unknown space: ${spaceId}`);
  const existing = await db.syncProviderBindings.get([spaceId, DEXIE_CLOUD_PROVIDER_ID]);
  invariant(
    !isShared(existing?.externalScopeId, privateRealm),
    `Space is already shared: ${spaceId} (realm ${String(existing?.externalScopeId)})`,
  );

  return db.transaction('rw', tablesFor(db), async () => {
    const realmId = await db.realms.add({ name: space.name });
    await restampScopeFrames({ db, accessScopeId: spaceId, realmId });
    await writeBinding({ db, scopeId: spaceId, externalScopeId: realmId });
    return realmId;
  });
};

/**
 * Return a scope to its owner's private realm: restamp its frames with that
 * realm, drop the binding, then delete the custom realm and its membership.
 * Dropping the members is the point — a realm left behind with members would
 * keep granting access to operations that have moved out of it.
 *
 * A no-op on a scope that was never shared.
 */
export const dropSpaceRealm = async (
  spaceId: string,
  db: LoremDB = appDb,
): Promise<void> => {
  const privateRealm = privateRealmOf(db);
  const binding = await db.syncProviderBindings.get([spaceId, DEXIE_CLOUD_PROVIDER_ID]);
  const realmId = binding?.externalScopeId;
  if (realmId === undefined || !isShared(realmId, privateRealm)) return;

  await db.transaction('rw', tablesFor(db), async () => {
    await restampScopeFrames({ db, accessScopeId: spaceId, realmId: privateRealm });
    await writeBinding({ db, scopeId: spaceId, externalScopeId: undefined });
    await db.members.where({ realmId }).delete();
    await db.realms.delete(realmId);
  });
};
